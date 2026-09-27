// Deterministic, explainable scoring. The numbers come from a fixed formula
// over the verified evidence — not from the model — so the same evidence
// always yields the same score and every point can be traced back.

import type {
  DimensionScore,
  KeywordAnalysis,
  MatchLevel,
  RequirementCategory,
  Scores,
  VerifiedAssessment,
} from "@/types/analysis";

export const MATCH_CREDIT: Record<MatchLevel, number> = {
  strong: 1,
  partial: 0.6,
  transferable: 0.35,
  none: 0,
};

export const IMPORTANCE_WEIGHT = { required: 2, preferred: 1 } as const;

const DIMENSIONS: {
  key: DimensionScore["key"];
  label: string;
  weight: number;
  categories: RequirementCategory[];
}[] = [
  { key: "technical", label: "Technical Skills", weight: 0.4, categories: ["technical"] },
  { key: "experience", label: "Experience", weight: 0.35, categories: ["experience", "domain", "soft_skill"] },
  { key: "keywords", label: "Keyword Alignment", weight: 0.15, categories: [] },
  { key: "education", label: "Education", weight: 0.1, categories: ["education"] },
];

function weightedScore(assessments: VerifiedAssessment[]): number | null {
  if (assessments.length === 0) return null;
  let earned = 0;
  let possible = 0;
  for (const a of assessments) {
    const weight = IMPORTANCE_WEIGHT[a.requirement.importance];
    earned += weight * MATCH_CREDIT[a.match];
    possible += weight;
  }
  return Math.round((earned / possible) * 100);
}

export function computeScores(assessments: VerifiedAssessment[], keywords: KeywordAnalysis): Scores {
  const keywordTotal = keywords.found.length + keywords.missing.length;

  const dimensions: DimensionScore[] = DIMENSIONS.map((dimension) => {
    if (dimension.key === "keywords") {
      return {
        key: dimension.key,
        label: dimension.label,
        weight: dimension.weight,
        score: keywordTotal ? Math.round((keywords.found.length / keywordTotal) * 100) : null,
        basis: `${keywords.found.length} of ${keywordTotal} ATS keywords found verbatim in the resume.`,
      };
    }
    const relevant = assessments.filter((a) => dimension.categories.includes(a.requirement.category));
    return {
      key: dimension.key,
      label: dimension.label,
      weight: dimension.weight,
      score: weightedScore(relevant),
      basis: relevant.length
        ? `${relevant.length} requirement(s): ${summarizeMatches(relevant)}.`
        : "The job description lists no requirements in this area, so it is excluded from the overall score.",
    };
  });

  // Re-normalise weights across the dimensions that actually apply.
  const scored = dimensions.filter((d) => d.score !== null);
  const totalWeight = scored.reduce((sum, d) => sum + d.weight, 0);
  const overall = totalWeight
    ? Math.round(scored.reduce((sum, d) => sum + (d.score as number) * d.weight, 0) / totalWeight)
    : 0;

  return {
    overall,
    dimensions,
    method:
      "Each requirement earns credit by match level (strong 100%, partial 60%, transferable 35%, no evidence 0%), " +
      "weighted 2× if required and 1× if preferred. Keyword alignment is the share of ATS keywords found verbatim. " +
      "The overall score weights Technical 40%, Experience 35%, Keywords 15%, Education 10%, re-normalised when a dimension does not apply.",
  };
}

function summarizeMatches(assessments: VerifiedAssessment[]): string {
  const counts: Record<MatchLevel, number> = { strong: 0, partial: 0, transferable: 0, none: 0 };
  for (const a of assessments) counts[a.match]++;
  return [
    counts.strong && `${counts.strong} strong`,
    counts.partial && `${counts.partial} partial`,
    counts.transferable && `${counts.transferable} transferable`,
    counts.none && `${counts.none} no evidence`,
  ]
    .filter(Boolean)
    .join(", ");
}
