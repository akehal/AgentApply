import { MATCH_LABELS, SEVERITY_TONE } from "@/components/ui/labels";
import type { AnalysisReport, VerifiedAssessment } from "@/types/analysis";
import { Badge, Card, EmptyNote, SectionHeading } from "@/components/ui/primitives";

interface Item {
  requirementId: string;
  explanation: string;
  severity?: "critical" | "moderate" | "minor";
}

export function MatchSections({ report }: { report: AnalysisReport }) {
  const byId = new Map(report.assessments.map((a) => [a.requirementId, a]));
  const { strongestMatches, partialMatches, gaps } = report.scoringInsights;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MatchColumn
        title="Strongest Matches"
        subtitle="Clear, quoted evidence"
        items={strongestMatches}
        byId={byId}
        empty="No strong matches identified."
        // Every item here is a strong match, so the match badge would be noise.
        showMatchLevel={false}
      />
      <MatchColumn
        title="Partial Matches"
        subtitle="Some evidence, room to strengthen"
        items={partialMatches}
        byId={byId}
        empty="No partial matches identified."
      />
      <MatchColumn
        title="Skill / Requirement Gaps"
        subtitle="Not supported by the resume"
        items={gaps}
        byId={byId}
        empty="No significant gaps identified."
      />
    </div>
  );
}

function MatchColumn({
  title,
  subtitle,
  items,
  byId,
  empty,
  showMatchLevel = true,
}: {
  title: string;
  subtitle: string;
  items: Item[];
  byId: Map<string, VerifiedAssessment>;
  empty: string;
  showMatchLevel?: boolean;
}) {
  const rows = items.flatMap((item) => {
    const assessment = byId.get(item.requirementId);
    return assessment ? [{ item, assessment }] : [];
  });

  return (
    <Card>
      <SectionHeading title={title} subtitle={subtitle} aside={<Badge>{rows.length}</Badge>} />
      {rows.length === 0 ? (
        <EmptyNote>{empty}</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ item, assessment }) => {
            const match = MATCH_LABELS[assessment.match];
            return (
              <li key={item.requirementId} className="rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {showMatchLevel && <Badge tone={match.tone}>{match.label}</Badge>}
                  {item.severity && <Badge tone={SEVERITY_TONE[item.severity]}>{item.severity}</Badge>}
                  <Badge>{assessment.requirement.importance}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium leading-snug text-zinc-100">{assessment.requirement.requirement}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{item.explanation}</p>
                {assessment.evidence[0] && (
                  <blockquote className="mt-2 border-l-2 border-emerald-400/30 pl-3 text-xs italic leading-relaxed text-zinc-400">
                    “{assessment.evidence[0]}”
                  </blockquote>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
