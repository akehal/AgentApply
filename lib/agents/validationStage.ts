import "server-only";
import { precheckRecommendation } from "@/lib/validation";
import type { Recommendation, ValidatedRecommendation, ValidationIssue, ValidationReport } from "@/types/analysis";
import { runValidationAgent } from "./validationAgent";

// Deterministic issues that always force a rejection, regardless of the AI verdict.
const HARD_FAIL_ISSUES: ValidationIssue[] = ["original_not_in_resume", "fabricated_metric", "exaggerated_responsibility"];

const HARD_FAIL_REASONS: Partial<Record<ValidationIssue, string>> = {
  original_not_in_resume: "Automated check: the quoted original text was not found in the resume.",
  fabricated_metric: "Automated check: the suggestion introduces a number that does not appear anywhere in the resume.",
  exaggerated_responsibility: "Automated check: the suggestion uses a leadership or ownership verb that the resume never uses.",
};

export interface ValidationStageResult {
  recommendations: ValidatedRecommendation[];
  report: ValidationReport;
}

/**
 * Stage 5: deterministic pre-checks plus the independent AI critic, merged conservatively.
 *
 * A recommendation is approved only if the critic approves it AND no hard-fail
 * pre-check fired. A missing verdict counts as a rejection.
 */
export async function validateRecommendations(
  resume: string,
  recommendations: Recommendation[],
  signal?: AbortSignal,
): Promise<ValidationStageResult> {
  if (recommendations.length === 0) {
    return {
      recommendations: [],
      report: {
        summary: "No recommendations were produced, so there was nothing to validate.",
        confidence: "high",
        approvedCount: 0,
        rejectedCount: 0,
      },
    };
  }

  const precheckFlags: Record<string, ValidationIssue[]> = Object.fromEntries(
    recommendations.map((r) => [r.id, precheckRecommendation(r, resume)]),
  );

  const aiResult = await runValidationAgent(resume, recommendations, precheckFlags, signal);
  const verdicts = new Map(aiResult.verdicts.map((v) => [v.recommendationId, v]));

  const merged = recommendations.map((rec): ValidatedRecommendation => {
    const verdict = verdicts.get(rec.id);
    const precheckIssues = precheckFlags[rec.id];
    const hardFails = precheckIssues.filter((issue) => HARD_FAIL_ISSUES.includes(issue));
    const issues = [...new Set([...(verdict?.issues ?? []), ...hardFails])];
    const audit = { aiVerdict: verdict?.verdict ?? ("missing" as const), precheckIssues, issues };

    if (!verdict) {
      return {
        ...rec,
        ...audit,
        status: "rejected",
        validationReason: "The validator returned no verdict, so this recommendation is withheld by default.",
      };
    }
    if (hardFails.length > 0) {
      const automated = hardFails.map((issue) => HARD_FAIL_REASONS[issue]).join(" ");
      return {
        ...rec,
        ...audit,
        status: "rejected",
        validationReason: verdict.verdict === "rejected" ? `${verdict.reason} ${automated}` : automated,
      };
    }
    return { ...rec, ...audit, status: verdict.verdict, validationReason: verdict.reason };
  });

  const approvedCount = merged.filter((r) => r.status === "approved").length;
  return {
    recommendations: merged,
    report: {
      summary: aiResult.summary,
      confidence: aiResult.confidence,
      approvedCount,
      rejectedCount: merged.length - approvedCount,
    },
  };
}
