import { AI_DISCLAIMER } from "@/lib/constants";
import { MATCH_LABELS, scoreTone, type ScoreTone } from "@/components/ui/labels";
import type { AnalysisReport, MatchLevel } from "@/types/analysis";
import { Badge, Card, cx, SectionHeading } from "@/components/ui/primitives";

const BAR_COLORS: Record<ScoreTone, string> = { green: "bg-emerald-400", amber: "bg-amber-400", rose: "bg-rose-400" };
const RING_COLORS: Record<ScoreTone, string> = { green: "#34d399", amber: "#fbbf24", rose: "#fb7185" };
const MATCH_ORDER: MatchLevel[] = ["strong", "partial", "transferable", "none"];

export function ScoreOverview({ report }: { report: AnalysisReport }) {
  const { scores, scoringInsights, requirements, assessments } = report;
  const matchCounts = MATCH_ORDER.map((level) => ({ level, count: assessments.filter((a) => a.match === level).length }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <Card className="flex flex-col items-center text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Overall Match Score</p>
        <ScoreRing score={scores.overall} color={RING_COLORS[scoreTone(scores.overall)]} />
        {(requirements.jobTitle || requirements.company) && (
          <p className="text-sm text-zinc-300">
            {requirements.jobTitle}
            {requirements.jobTitle && requirements.company && <span className="text-zinc-500"> at </span>}
            {requirements.company}
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Requirements by match level">
          {matchCounts.map(({ level, count }) => (
            <Badge key={level} tone={count ? MATCH_LABELS[level].tone : "zinc"}>
              {count} {MATCH_LABELS[level].short}
            </Badge>
          ))}
        </div>
        <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-left text-xs leading-relaxed text-amber-200/90">
          {AI_DISCLAIMER}
        </p>
      </Card>

      <Card>
        <SectionHeading
          title="Score Breakdown"
          subtitle="Numbers are computed in code from verified evidence; the Scoring agent only explains them."
        />
        <p className="mb-5 border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-zinc-300">{scoringInsights.summary}</p>
        <ul className="space-y-5">
          {scores.dimensions.map((d) => (
            <li key={d.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-zinc-200">
                  {d.label} <span className="text-xs font-normal text-zinc-500">· weight {Math.round(d.weight * 100)}%</span>
                </span>
                {d.score === null ? (
                  <Badge>Not assessed</Badge>
                ) : (
                  <span className="font-mono text-sm tabular-nums text-zinc-100">{d.score}</span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                {d.score !== null && (
                  <div className={cx("h-full rounded-full", BAR_COLORS[scoreTone(d.score)])} style={{ width: `${d.score}%` }} />
                )}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{scoringInsights.dimensionRationales[d.key]}</p>
              <p className="mt-1 font-mono text-[11px] text-zinc-500">{d.basis}</p>
            </li>
          ))}
        </ul>
        <details className="mt-5 text-xs text-zinc-400">
          <summary className="cursor-pointer select-none text-zinc-300 hover:text-zinc-100">How is this calculated?</summary>
          <p className="mt-2 leading-relaxed">{scores.method}</p>
        </details>
      </Card>
    </div>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative my-4 h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tabular-nums text-zinc-50">{score}</span>
        <span className="text-xs text-zinc-500">out of 100</span>
      </div>
    </div>
  );
}
