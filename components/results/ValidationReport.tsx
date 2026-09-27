import type { ValidationReport as ValidationData } from "@/types/analysis";
import { Badge, Card, SectionHeading } from "@/components/ui/primitives";

const CONFIDENCE_TONE = { high: "green", medium: "amber", low: "rose" } as const;

export function ValidationReport({ validation }: { validation: ValidationData }) {
  return (
    <Card>
      <SectionHeading
        title="Validation Report"
        subtitle="An independent agent audited every recommendation against your original resume."
        aside={<Badge tone={CONFIDENCE_TONE[validation.confidence]}>{validation.confidence} confidence</Badge>}
      />
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <Stat label="Approved" value={validation.approvedCount} className="text-emerald-300" />
        <Stat label="Rejected" value={validation.rejectedCount} className="text-rose-300" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-zinc-300">{validation.summary}</p>
      <p className="mt-3 text-xs text-zinc-500">
        Checks: unsupported skills or technologies, invented experience, fabricated metrics, exaggerated responsibilities,
        misleading wording, contradictions. Automated checks also reject any suggestion whose original text is not in the
        resume, that introduces a new number, or that adds a leadership or ownership verb the resume never uses.
      </p>
    </Card>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
      <p className={`text-2xl font-semibold tabular-nums ${className}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
