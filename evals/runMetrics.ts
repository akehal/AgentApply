// Performance metrics: runs realistic resume/job pairs through the complete
// pipeline one at a time (sequentially, so durations are not skewed by
// concurrent requests) and records raw measurements.
//
//   npm run eval:metrics -- --tag=run1

import { REALISTIC_CASES } from "./cases/realistic";
import { log, runPipeline, writeResult } from "./shared";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const tag = String(args.tag ?? "run");

async function main() {
  const rows = [];
  for (const c of REALISTIC_CASES) {
    log(`[${c.id}] start: ${c.title}`);
    const run = await runPipeline(c.resume, c.jobDescription);
    const r = run.report;
    const row = {
      caseId: c.id,
      title: c.title,
      ok: run.ok,
      totalDurationMs: run.wallClockMs,
      stageDurationsMs: r?.meta.stageDurationsMs ?? null,
      stagesCompleted: run.stagesCompleted.length,
      criteriaExtracted: r?.requirements.keyRequirements.length ?? null,
      criteriaEvaluated: r?.assessments.length ?? null,
      assessmentsWithVerifiedEvidence: r ? r.assessments.filter((a) => a.evidence.length > 0).length : null,
      quotesDiscarded: r ? r.assessments.reduce((n, a) => n + a.discardedEvidence.length, 0) : null,
      assessmentsDowngraded: r ? r.assessments.filter((a) => a.downgraded).length : null,
      matchDistribution: r
        ? r.assessments.reduce<Record<string, number>>((acc, a) => ((acc[a.match] = (acc[a.match] ?? 0) + 1), acc), {})
        : null,
      overallScore: r?.scores.overall ?? null,
      recommendationsGenerated: r?.recommendations.length ?? null,
      recommendationsApproved: r ? r.recommendations.filter((x) => x.status === "approved").length : null,
      recommendationsRejected: r ? r.recommendations.filter((x) => x.status === "rejected").length : null,
      rejectedByPrecheckOnly: r ? r.recommendations.filter((x) => x.status === "rejected" && x.aiVerdict === "approved").length : null,
      rejections: r
        ? r.recommendations
            .filter((x) => x.status === "rejected")
            .map((x) => ({ issues: x.issues, original: x.original, suggested: x.suggested, reason: x.validationReason }))
        : [],
      errors: run.ok ? [] : [{ code: run.errorCode, message: run.errorMessage, failedStages: run.stagesFailed }],
    };
    rows.push(row);
    log(
      `[${c.id}] ${run.ok ? "ok" : `FAILED ${run.errorCode}`} ${(run.wallClockMs / 1000).toFixed(1)}s · criteria ${row.criteriaEvaluated} · recs ${row.recommendationsGenerated} (${row.recommendationsApproved} approved)`,
    );
  }
  const file = writeResult(`metrics-${tag}`, { generatedAt: new Date().toISOString(), mode: "sequential", rows });
  log(`Wrote ${file}`);
}

main().catch((error) => {
  console.error("Metrics run crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
