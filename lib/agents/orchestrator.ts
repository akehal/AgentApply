import "server-only";
import { getModel } from "@/lib/anthropic";
import { computeScores } from "@/lib/scoring";
import { analyzeKeywords, verifyAssessments } from "@/lib/validation";
import type { AnalysisEvent, AnalysisReport, AnalyzeRequestBody, StageId } from "@/types/analysis";
import { runRequirementsAgent } from "./requirementsAgent";
import { runEvidenceAgent } from "./evidenceAgent";
import { runScoringAgent } from "./scoringAgent";
import { runRecommendationAgent } from "./recommendationAgent";
import { validateRecommendations } from "./validationStage";

type Emit = (event: AnalysisEvent) => void;

/**
 * Runs the five-stage pipeline:
 *
 *   1. Requirements ──► 2. Evidence ──┬──► 3. Scoring
 *                                     └──► 4. Recommendations ──► 5. Validation
 *
 * Stages 3 and 4 depend only on stages 1–2, so they run concurrently.
 * Every stage's output is schema-validated (in callStructured) and then passed
 * through deterministic guardrails before the next stage sees it.
 */
export async function runAnalysis(
  { resume, jobDescription }: AnalyzeRequestBody,
  emit: Emit,
  externalSignal?: AbortSignal,
): Promise<AnalysisReport> {
  const startedAt = Date.now();
  // Internal controller so a failure in one parallel branch cancels the other.
  const controller = new AbortController();
  externalSignal?.addEventListener("abort", () => controller.abort(), { once: true });
  const signal = controller.signal;
  const stageDurationsMs: Partial<Record<StageId, number>> = {};

  async function stage<T>(id: StageId, work: () => Promise<T>, done?: (result: T) => string): Promise<T> {
    emit({ type: "stage", stage: id, status: "processing" });
    const t0 = Date.now();
    try {
      const result = await work();
      stageDurationsMs[id] = Date.now() - t0;
      emit({ type: "stage", stage: id, status: "complete", message: done?.(result) });
      return result;
    } catch (error) {
      // A stage aborted because its sibling failed is reported as cancelled, not as the cause.
      const cancelled = signal.aborted && !externalSignal?.aborted;
      emit({ type: "stage", stage: id, status: "failed", message: cancelled ? "Cancelled after another stage failed" : undefined });
      throw error;
    }
  }

  // ---- Stage 1: job description only ----
  const requirements = await stage(
    "requirements",
    () => runRequirementsAgent(jobDescription, signal),
    (r) => `${r.keyRequirements.length} key requirements, ${r.atsKeywords.length} ATS keywords`,
  );

  // ---- Stage 2: requirements + resume, then quote verification ----
  const evidence = await stage(
    "evidence",
    async () => {
      const raw = await runEvidenceAgent(requirements.keyRequirements, resume, signal);
      return {
        summary: raw.summary,
        assessments: verifyAssessments(raw.assessments, requirements.keyRequirements, resume),
      };
    },
    (e) => {
      const downgraded = e.assessments.filter((a) => a.downgraded).length;
      return `${e.assessments.length} requirements assessed${downgraded ? `, ${downgraded} downgraded (unverifiable quotes)` : ""}`;
    },
  );

  const keywords = analyzeKeywords(requirements.atsKeywords, resume);
  const scores = computeScores(evidence.assessments, keywords);

  // ---- Stages 3 and 4 in parallel; stage 5 follows stage 4 ----
  const scoringTask = stage(
    "scoring",
    () => runScoringAgent(evidence.assessments, scores, keywords, signal),
    () => `Overall alignment ${scores.overall}/100`,
  );

  const recommendationTask = stage(
    "recommendations",
    () => runRecommendationAgent(resume, evidence.assessments, keywords, signal),
    (r) => `${r.recommendations.length} recommendations drafted`,
  ).then((recs) =>
    stage(
      "validation",
      () => validateRecommendations(resume, recs.recommendations, signal),
      (v) => `${v.report.approvedCount} approved, ${v.report.rejectedCount} rejected`,
    ).then((validated) => ({ recs, validated })),
  );

  let results;
  try {
    results = await Promise.all([scoringTask, recommendationTask]);
  } catch (error) {
    controller.abort();
    // Avoid unhandled rejections from the sibling branch after aborting.
    await Promise.allSettled([scoringTask, recommendationTask]);
    throw error;
  }
  const [scoringInsights, { recs, validated }] = results;

  return {
    requirements,
    assessments: evidence.assessments,
    evidenceSummary: evidence.summary,
    keywords,
    scores,
    scoringInsights,
    recommendations: validated.recommendations,
    unaddressableGaps: recs.unaddressableGaps,
    validation: validated.report,
    meta: { model: getModel(), durationMs: Date.now() - startedAt, stageDurationsMs },
  };
}
