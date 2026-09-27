// Adversarial evaluation: runs hallucination-trap cases through the complete
// pipeline, then injects known-fabricated and honest "control" recommendations
// directly into Stage 5 to measure what validation catches.
//
//   npm run eval:adversarial              (all cases, 3 injection trials)
//   npm run eval:adversarial -- --cases=C,F --trials=3 --tag=rerun

import { validateRecommendations } from "@/lib/agents/validationStage";
import { appearsIn } from "@/lib/validation";
import type { Recommendation } from "@/types/analysis";
import { ADVERSARIAL_CASES } from "./cases/adversarial";
import { log, pool, runPipeline, writeResult } from "./shared";
import type { AdversarialCase } from "./types";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const caseIds: string[] | null = args.cases ? String(args.cases).split(",") : null;
const trials = Number(args.trials ?? 3);
const tag = String(args.tag ?? "run");
const cases = ADVERSARIAL_CASES.filter((c) => !caseIds || caseIds.includes(c.id));

/** Forbidden terms found in `text`. sanityCheck guarantees none of them appear in the resume. */
function forbiddenHits(c: AdversarialCase, text: string): string[] {
  return c.forbiddenTerms.map((re) => text.match(re)?.[0]).filter((hit): hit is string => !!hit);
}

function sanityCheck(c: AdversarialCase) {
  for (const re of c.forbiddenTerms) {
    if (re.test(c.resume)) throw new Error(`Case ${c.id}: forbidden term ${re} appears in the resume`);
  }
  for (const inj of c.injected) {
    if (!appearsIn(c.resume, inj.original)) throw new Error(`Case ${c.id}: injected original not in resume: ${inj.original}`);
  }
}

async function naturalRun(c: AdversarialCase) {
  log(`[${c.id}] full pipeline start`);
  const run = await runPipeline(c.resume, c.jobDescription);
  log(`[${c.id}] full pipeline ${run.ok ? "ok" : `FAILED (${run.errorCode})`} in ${(run.wallClockMs / 1000).toFixed(1)}s`);
  if (!run.report) return { caseId: c.id, title: c.title, ...run, report: undefined };

  const r = run.report;
  const trap = r.assessments.filter((a) => c.trapRequirement.test(a.requirement.requirement));
  const trapIds = new Set(trap.map((a) => a.requirementId));
  const recommendations = r.recommendations.map((rec) => ({
    id: rec.id,
    status: rec.status,
    aiVerdict: rec.aiVerdict,
    precheckIssues: rec.precheckIssues,
    issues: rec.issues,
    targetsTrap: rec.requirementIds.some((id) => trapIds.has(id)),
    forbiddenHits: forbiddenHits(c, rec.suggested),
    original: rec.original,
    suggested: rec.suggested,
    reason: rec.reason,
    validationReason: rec.validationReason,
  }));

  return {
    caseId: c.id,
    title: c.title,
    ok: run.ok,
    wallClockMs: run.wallClockMs,
    stagesCompleted: run.stagesCompleted,
    stagesFailed: run.stagesFailed,
    overall: r.scores.overall,
    criteriaExtracted: r.requirements.keyRequirements.length,
    trapAssessments: trap.map((a) => ({
      id: a.requirementId,
      requirement: a.requirement.requirement,
      match: a.match,
      downgraded: a.downgraded,
      evidence: a.evidence,
      discardedEvidence: a.discardedEvidence,
      evidenceHallucination: c.hallucinatedMatchLevels.includes(a.match),
    })),
    trapListedAsGap: r.scoringInsights.gaps.some((g) => trapIds.has(g.requirementId)),
    trapListedUnaddressable: r.unaddressableGaps.some((g) => trapIds.has(g.requirementId)),
    downgradedAssessments: r.assessments.filter((a) => a.downgraded).length,
    discardedQuotes: r.assessments.reduce((n, a) => n + a.discardedEvidence.length, 0),
    recommendations,
    // Automated oracle: a suggestion containing a forbidden term is unsupported.
    autoUnsupported: recommendations.filter((x) => x.forbiddenHits.length > 0 || x.precheckIssues.length > 0).length,
    autoUnsupportedApproved: recommendations.filter((x) => (x.forbiddenHits.length > 0 || x.precheckIssues.length > 0) && x.status === "approved").length,
  };
}

async function injectionTrial(c: AdversarialCase, trial: number) {
  const recs: Recommendation[] = c.injected.map((inj, i) => ({
    id: `REC${i + 1}`,
    kind: "rewrite",
    requirementIds: [],
    original: inj.original,
    suggested: inj.suggested,
    reason: "Aligns the resume with the job description.",
  }));
  try {
    const { recommendations, report } = await validateRecommendations(c.resume, recs);
    return {
      caseId: c.id,
      trial,
      ok: true,
      confidence: report.confidence,
      items: recommendations.map((rec, i) => ({
        expected: c.injected[i].expected,
        plants: c.injected[i].plants ?? null,
        addedAfterRun1: c.injected[i].addedAfterRun1 ?? false,
        suggested: rec.suggested,
        finalStatus: rec.status,
        aiVerdict: rec.aiVerdict,
        precheckIssues: rec.precheckIssues,
        issues: rec.issues,
        reason: rec.validationReason,
        caughtBy:
          rec.status === "approved"
            ? null
            : rec.aiVerdict === "rejected" && rec.precheckIssues.length
              ? "both"
              : rec.aiVerdict === "rejected"
                ? "ai_validator"
                : "precheck",
      })),
    };
  } catch (error) {
    return { caseId: c.id, trial, ok: false, error: error instanceof Error ? error.message.slice(0, 300) : String(error), items: [] };
  }
}

async function main() {
  cases.forEach(sanityCheck);
  log(`Adversarial eval: ${cases.length} case(s), ${trials} injection trial(s) each`);

  const natural = await pool(cases, 3, naturalRun);
  const injectionJobs = cases.flatMap((c) => Array.from({ length: trials }, (_, t) => ({ c, t: t + 1 })));
  const injection = await pool(injectionJobs, 4, ({ c, t }) => injectionTrial(c, t));

  const items = injection.flatMap((t) => t.items);
  const fabricated = items.filter((i) => i.expected === "fabricated");
  const controls = items.filter((i) => i.expected === "control");
  const summary = {
    naturalRuns: natural.length,
    naturalRunsSucceeded: natural.filter((n) => n.ok).length,
    evidenceHallucinations: natural.flatMap((n) => ("trapAssessments" in n ? n.trapAssessments ?? [] : [])).filter((a) => a.evidenceHallucination).length,
    naturalAutoUnsupported: natural.reduce((s, n) => s + (("autoUnsupported" in n && n.autoUnsupported) || 0), 0),
    naturalAutoUnsupportedApproved: natural.reduce((s, n) => s + (("autoUnsupportedApproved" in n && n.autoUnsupportedApproved) || 0), 0),
    injectionTrialsFailed: injection.filter((t) => !t.ok).length,
    injectedFabricated: fabricated.length,
    injectedFabricatedRejected: fabricated.filter((i) => i.finalStatus === "rejected").length,
    injectedFabricatedRejectedByAi: fabricated.filter((i) => i.aiVerdict === "rejected").length,
    injectedControls: controls.length,
    injectedControlsApproved: controls.filter((i) => i.finalStatus === "approved").length,
  };

  const file = writeResult(`adversarial-${tag}`, { generatedAt: new Date().toISOString(), trials, summary, natural, injection });
  log(`Summary: ${JSON.stringify(summary)}`);
  log(`Wrote ${file}`);
}

main().catch((error) => {
  console.error("Eval crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
