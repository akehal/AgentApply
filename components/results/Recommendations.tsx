import { ISSUE_LABELS } from "@/components/ui/labels";
import type { AnalysisReport, ValidatedRecommendation } from "@/types/analysis";
import { Badge, Card, cx, EmptyNote, SectionHeading } from "@/components/ui/primitives";

const KIND_LABELS: Record<ValidatedRecommendation["kind"], string> = {
  rewrite: "Rewrite",
  keyword_alignment: "Keyword alignment",
  emphasis: "Emphasis",
};

export function Recommendations({ report }: { report: AnalysisReport }) {
  const approved = report.recommendations.filter((r) => r.status === "approved");
  const rejected = report.recommendations.filter((r) => r.status === "rejected");
  const requirementText = new Map(report.assessments.map((a) => [a.requirementId, a.requirement.requirement]));

  return (
    <Card>
      <SectionHeading
        title="Recommendations"
        subtitle="Edits to existing resume lines. Only suggestions approved by the independent validation agent are shown here."
        aside={<Badge tone="green">{approved.length} approved</Badge>}
      />

      {approved.length === 0 ? (
        <EmptyNote>
          No recommendations passed validation. This usually means every suggested edit overstated what the resume supports.
        </EmptyNote>
      ) : (
        <ol className="space-y-4">
          {approved.map((rec, i) => (
            <li key={rec.id}>
              <RecommendationCard rec={rec} index={i + 1} requirementText={requirementText} />
            </li>
          ))}
        </ol>
      )}

      {report.unaddressableGaps.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-zinc-200">Not addressable by rewording</p>
          <p className="mb-3 mt-0.5 text-xs text-zinc-500">
            The resume does not show these. No edit is suggested, because rewording cannot make them true.
          </p>
          <ul className="space-y-2">
            {report.unaddressableGaps.map((gap) => (
              <li key={gap.requirementId} className="text-[13px] leading-relaxed text-zinc-400">
                <span className="text-zinc-200">{requirementText.get(gap.requirementId) ?? gap.requirementId}.</span> {gap.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rejected.length > 0 && (
        <details className="mt-6 rounded-xl border border-rose-400/15 bg-rose-400/[0.03] p-4">
          <summary className="cursor-pointer select-none text-sm font-medium text-rose-200">
            {rejected.length} suggestion{rejected.length === 1 ? " was" : "s were"} rejected by validation. Show what and why
          </summary>
          <ol className="mt-4 space-y-4">
            {rejected.map((rec, i) => (
              <li key={rec.id}>
                <RecommendationCard rec={rec} index={i + 1} requirementText={requirementText} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </Card>
  );
}

function RecommendationCard({
  rec,
  index,
  requirementText,
}: {
  rec: ValidatedRecommendation;
  index: number;
  requirementText: Map<string, string>;
}) {
  const approved = rec.status === "approved";
  const targets = rec.requirementIds.map((id) => requirementText.get(id)).filter((t): t is string => !!t);

  return (
    <article className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <span className="font-mono text-xs text-zinc-500">#{index}</span>
            {KIND_LABELS[rec.kind]}
          </p>
          {targets.length > 0 && (
            <p className="mt-0.5 flex min-w-0 gap-1 text-xs text-zinc-500" title={targets.join(" · ")}>
              <span className="truncate">Addresses: {targets[0]}</span>
              {targets.length > 1 && <span className="shrink-0">+{targets.length - 1} more</span>}
            </p>
          )}
        </div>
        <Badge tone={approved ? "green" : "rose"}>{approved ? "✓ Approved" : "✕ Rejected"}</Badge>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Original" className="border-white/[0.06] bg-white/[0.02] text-zinc-400">
          {rec.original}
        </Field>
        <Field
          label="Suggested"
          className={
            approved ? "border-emerald-400/20 bg-emerald-400/[0.04] text-zinc-100" : "border-rose-400/20 bg-rose-400/[0.04] text-zinc-300"
          }
          textClassName={approved ? undefined : "line-through decoration-rose-400/40"}
        >
          {rec.suggested}
        </Field>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-2 text-[13px] leading-relaxed sm:grid-cols-[6rem_minmax(0,1fr)]">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:pt-0.5">Why</dt>
        <dd className="text-zinc-300">{rec.reason}</dd>
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:pt-0.5">Validation</dt>
        <dd className="space-y-1.5">
          {rec.issues.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rec.issues.map((issue) => (
                <Badge key={issue} tone="rose">
                  {ISSUE_LABELS[issue]}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-zinc-400">{rec.validationReason}</p>
        </dd>
      </dl>
    </article>
  );
}

function Field({
  label,
  className,
  textClassName,
  children,
}: {
  label: string;
  className: string;
  textClassName?: string;
  children: string;
}) {
  return (
    <div className={cx("rounded-lg border p-3", className)}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={cx("text-sm leading-relaxed", textClassName)}>{children}</p>
    </div>
  );
}
