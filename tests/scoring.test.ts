import { describe, expect, it } from "vitest";
import { computeScores } from "@/lib/scoring";
import type { KeyRequirement, MatchLevel, VerifiedAssessment } from "@/types/analysis";

function assessment(
  id: string,
  match: MatchLevel,
  category: KeyRequirement["category"],
  importance: KeyRequirement["importance"] = "required",
): VerifiedAssessment {
  return {
    requirementId: id,
    match,
    evidence: [],
    rationale: "",
    discardedEvidence: [],
    downgraded: false,
    requirement: { id, requirement: id, category, importance },
  };
}

const dim = (scores: ReturnType<typeof computeScores>, key: string) => scores.dimensions.find((d) => d.key === key)!;

describe("computeScores", () => {
  it("weights required requirements twice as much as preferred ones", () => {
    const scores = computeScores(
      [assessment("R1", "strong", "technical", "required"), assessment("R2", "none", "technical", "preferred")],
      { found: [], missing: [] },
    );
    // (2*1 + 1*0) / 3 = 66.7
    expect(dim(scores, "technical").score).toBe(67);
  });

  it("applies partial and transferable credit", () => {
    const scores = computeScores(
      [assessment("R1", "partial", "experience"), assessment("R2", "transferable", "experience")],
      { found: [], missing: [] },
    );
    // (0.6 + 0.35) / 2 = 47.5
    expect(dim(scores, "experience").score).toBe(48);
  });

  it("excludes dimensions with no requirements and re-normalises the overall weights", () => {
    const scores = computeScores([assessment("R1", "strong", "technical")], { found: ["a"], missing: ["b"] });
    expect(dim(scores, "education").score).toBeNull();
    expect(dim(scores, "experience").score).toBeNull();
    // technical 100 (w .40) + keywords 50 (w .15) → (40 + 7.5) / .55 = 86.4
    expect(scores.overall).toBe(86);
  });

  it("is deterministic for identical evidence", () => {
    const input = [assessment("R1", "partial", "technical"), assessment("R2", "strong", "education")];
    const keywords = { found: ["x"], missing: ["y", "z"] };
    expect(computeScores(input, keywords)).toEqual(computeScores(input, keywords));
  });
});
