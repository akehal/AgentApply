import { callStructured } from "@/lib/anthropic";
import { ScoringInsightsSchema } from "@/lib/schemas";
import type { KeywordAnalysis, Scores, ScoringInsights, VerifiedAssessment } from "@/types/analysis";

const SYSTEM = `You are the Scoring agent in a resume-analysis pipeline.
The numeric scores have ALREADY been computed by a deterministic formula from verified evidence. You must not change or re-estimate them.
Your job is to interpret them so a candidate understands where they stand.

You receive: the scores and their formula, the verified per-requirement assessments, and the keyword analysis. You do not see the resume or job posting directly.

Produce:
- strongestMatches: the requirements with the strongest, most relevant evidence (up to 6), each with a one-sentence explanation referencing the evidence.
- partialMatches: requirements rated partial or transferable (up to 6), explaining what is present and what is missing.
- gaps: requirements rated none, plus partial matches on required items that materially weaken the application. Severity: critical (required and central to the role), moderate, or minor (preferred / peripheral).
- dimensionRationales: one or two sentences per dimension (technical, experience, keywords, education) explaining WHY the score is what it is, consistent with the numbers given. If a dimension score is null, say it was not assessed and why.
- summary: 2–3 neutral sentences summarising alignment.

Only reference requirement ids that appear in the input. Do not claim evidence that is not listed.`;

export async function runScoringAgent(
  assessments: VerifiedAssessment[],
  scores: Scores,
  keywords: KeywordAnalysis,
  signal?: AbortSignal,
): Promise<ScoringInsights> {
  const context = {
    scores,
    assessments: assessments.map((a) => ({
      id: a.requirementId,
      requirement: a.requirement.requirement,
      importance: a.requirement.importance,
      category: a.requirement.category,
      match: a.match,
      evidence: a.evidence,
      rationale: a.rationale,
    })),
    keywords,
  };

  const result = await callStructured({
    agent: "scoring",
    system: SYSTEM,
    user: `<scoring_input>\n${JSON.stringify(context, null, 2)}\n</scoring_input>`,
    schema: ScoringInsightsSchema,
    effort: "medium",
    signal,
  });

  // Drop any references to requirement ids that do not exist.
  const validIds = new Set(assessments.map((a) => a.requirementId));
  return {
    ...result,
    strongestMatches: result.strongestMatches.filter((m) => validIds.has(m.requirementId)),
    partialMatches: result.partialMatches.filter((m) => validIds.has(m.requirementId)),
    gaps: result.gaps.filter((g) => validIds.has(g.requirementId)),
  };
}
