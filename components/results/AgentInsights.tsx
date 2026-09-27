import type { ReactNode } from "react";
import { STAGES } from "@/lib/constants";
import { ISSUE_LABELS, MATCH_LABELS } from "@/components/ui/labels";
import type { AnalysisReport, StageId } from "@/types/analysis";
import { Badge, Card, EmptyNote, SectionHeading } from "@/components/ui/primitives";

export function AgentInsights({ report }: { report: AnalysisReport }) {
  const { meta } = report;
  const panels: Record<StageId, ReactNode> = {
    requirements: <RequirementsPanel report={report} />,
    evidence: <EvidencePanel report={report} />,
    scoring: (
      <div className="space-y-2 text-sm text-zinc-300">
        <p>{report.scoringInsights.summary}</p>
        <p className="text-xs text-zinc-500">{report.scores.method}</p>
      </div>
    ),
    recommendations: (
      <p className="text-sm text-zinc-300">
        Drafted {report.recommendations.length} recommendation(s) and flagged {report.unaddressableGaps.length} requirement(s) that
        cannot honestly be addressed by rewording.
      </p>
    ),
    validation: <ValidationPanel report={report} />,
  };

  return (
    <Card>
      <SectionHeading
        title="Agent Insights"
        subtitle="The structured output each stage produced, for inspecting how a conclusion was reached."
        aside={
          <span className="font-mono text-xs text-zinc-500">
            {meta.model} · {(meta.durationMs / 1000).toFixed(1)}s
          </span>
        }
      />
      <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
        {STAGES.map((stage, i) => (
          <details key={stage.id} className="group px-4 py-3">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-3 text-sm">
              <span className="text-zinc-200">
                <span aria-hidden className="mr-2 inline-block text-zinc-500 transition-transform group-open:rotate-90">
                  ›
                </span>
                <span className="mr-2 font-mono text-xs text-zinc-500">0{i + 1}</span>
                {stage.label}
                <span className="ml-2 hidden text-xs text-zinc-500 sm:inline">{stage.description}</span>
              </span>
              <span className="font-mono text-xs text-zinc-500">
                {meta.stageDurationsMs[stage.id] != null ? `${(meta.stageDurationsMs[stage.id]! / 1000).toFixed(1)}s` : ""}
              </span>
            </summary>
            <div className="pb-2 pt-4">{panels[stage.id]}</div>
          </details>
        ))}
      </div>
    </Card>
  );
}

function RequirementsPanel({ report }: { report: AnalysisReport }) {
  const r = report.requirements;
  const groups: [string, string[]][] = [
    ["Required skills", r.requiredSkills],
    ["Preferred skills", r.preferredSkills],
    ["Technologies", r.technologies],
    ["Experience", r.experienceRequirements],
    ["Education", r.educationRequirements],
    ["Soft skills", r.softSkills],
    ["Responsibilities", r.responsibilities],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map(([title, items]) => (
        <div key={title}>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</p>
          {items.length ? (
            <ul className="list-disc space-y-0.5 pl-4 text-sm text-zinc-300 marker:text-zinc-600">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <EmptyNote>None stated.</EmptyNote>
          )}
        </div>
      ))}
    </div>
  );
}

function EvidencePanel({ report }: { report: AnalysisReport }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-300">{report.evidenceSummary}</p>
      <ul className="space-y-2">
        {report.assessments.map((a) => (
          <li key={a.requirementId} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs text-zinc-500">{a.requirementId}</span>
              <Badge tone={MATCH_LABELS[a.match].tone}>{MATCH_LABELS[a.match].label}</Badge>
              <Badge>{a.requirement.importance}</Badge>
              <Badge>{a.requirement.category.replace("_", " ")}</Badge>
              {a.downgraded && <Badge tone="rose">downgraded</Badge>}
            </div>
            <p className="mt-1.5 text-sm text-zinc-200">{a.requirement.requirement}</p>
            <p className="mt-1 text-xs text-zinc-400">{a.rationale}</p>
            {a.evidence.map((quote) => (
              <blockquote key={quote} className="mt-1.5 border-l-2 border-emerald-400/30 pl-3 text-xs italic text-zinc-400">
                “{quote}”
              </blockquote>
            ))}
            {a.discardedEvidence.length > 0 && (
              <p className="mt-1.5 text-xs text-rose-300/80">
                {a.discardedEvidence.length} quote(s) discarded: not found verbatim in the resume.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shows which layer decided each recommendation: the AI critic, the deterministic pre-checks, or both. */
function ValidationPanel({ report }: { report: AnalysisReport }) {
  if (report.recommendations.length === 0) return <EmptyNote>Nothing to validate.</EmptyNote>;
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-zinc-500">
            <tr>
              <th className="pb-2 pr-3 font-medium">ID</th>
              <th className="pb-2 pr-3 font-medium">AI critic</th>
              <th className="pb-2 pr-3 font-medium">Code pre-checks</th>
              <th className="pb-2 font-medium">Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-zinc-300">
            {report.recommendations.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-3 font-mono text-zinc-400">{r.id}</td>
                <td className="py-2 pr-3">{r.aiVerdict}</td>
                <td className="py-2 pr-3">
                  {r.precheckIssues.length ? r.precheckIssues.map((i) => ISSUE_LABELS[i]).join(", ") : "passed"}
                </td>
                <td className="py-2">
                  <Badge tone={r.status === "approved" ? "green" : "rose"}>{r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        A recommendation is approved only if the AI critic approves it and no hard-fail pre-check fires. {report.validation.summary}
      </p>
    </div>
  );
}
