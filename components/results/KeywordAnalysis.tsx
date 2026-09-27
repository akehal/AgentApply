import type { KeywordAnalysis as KeywordData } from "@/types/analysis";
import { Badge, Card, EmptyNote, SectionHeading } from "@/components/ui/primitives";

export function KeywordAnalysis({ keywords }: { keywords: KeywordData }) {
  const total = keywords.found.length + keywords.missing.length;
  return (
    <Card>
      <SectionHeading
        title="Keyword Analysis"
        subtitle="ATS-style keywords from the posting, checked verbatim against your resume."
        aside={<Badge>{keywords.found.length} / {total} found</Badge>}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <KeywordGroup title="Found in resume" words={keywords.found} tone="green" empty="None of the keywords were found." />
        <KeywordGroup title="Missing from resume" words={keywords.missing} tone="rose" empty="All keywords were found." />
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Only add a missing keyword if it truthfully describes experience you already have.
      </p>
    </Card>
  );
}

function KeywordGroup({ title, words, tone, empty }: { title: string; words: string[]; tone: "green" | "rose"; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      {words.length === 0 ? (
        <EmptyNote>{empty}</EmptyNote>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {words.map((w) => (
            <Badge key={w} tone={tone}>
              {w}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
