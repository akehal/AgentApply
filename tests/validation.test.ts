import { describe, expect, it } from "vitest";
import {
  analyzeKeywords,
  appearsIn,
  getInputError,
  parseAnalyzeRequest,
  precheckRecommendation,
  verifyAssessments,
} from "@/lib/validation";
import { INPUT_LIMITS } from "@/lib/constants";
import type { KeyRequirement, Recommendation } from "@/types/analysis";

const RESUME = `Software Engineer — Example Co
- Built React and TypeScript dashboards for the “operations” team.
- Reduced load time by 40% using pagination.
- Wrote unit tests with Jest for a team of 6 engineers.
Skills: JavaScript, PostgreSQL`;

const req = (id: string, overrides: Partial<KeyRequirement> = {}): KeyRequirement => ({
  id,
  requirement: `Requirement ${id}`,
  category: "technical",
  importance: "required",
  ...overrides,
});

const rec = (overrides: Partial<Recommendation>): Recommendation => ({
  id: "REC1",
  kind: "rewrite",
  requirementIds: ["R1"],
  original: "Wrote unit tests with Jest for a team of 6 engineers.",
  suggested: "Wrote Jest unit tests for a team of 6 engineers.",
  reason: "test",
  ...overrides,
});

describe("input validation", () => {
  it("rejects empty, short, and oversized inputs", () => {
    const ok = "x".repeat(INPUT_LIMITS.minChars);
    expect(getInputError("", ok)).toMatch(/resume/i);
    expect(getInputError(ok, "  ")).toMatch(/job description/i);
    expect(getInputError("short", ok)).toMatch(/too short/);
    expect(getInputError("x".repeat(INPUT_LIMITS.resumeMaxChars + 1), ok)).toMatch(/too long/);
    expect(getInputError(ok, "x".repeat(INPUT_LIMITS.jobDescriptionMaxChars + 1))).toMatch(/too long/);
    expect(getInputError(ok, ok)).toBeNull();
  });

  it("rejects non-string request bodies with a 400", () => {
    expect(() => parseAnalyzeRequest(null)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => parseAnalyzeRequest({ resume: 1, jobDescription: "x" })).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe("appearsIn (quote verification)", () => {
  it("tolerates case, whitespace, smart quotes, bullets and trailing periods", () => {
    expect(appearsIn(RESUME, "built react and typescript dashboards for the \"operations\" team")).toBe(true);
    expect(appearsIn(RESUME, "- Reduced   load time by 40% using pagination")).toBe(true);
  });

  it("rejects paraphrases and invented text", () => {
    expect(appearsIn(RESUME, "Led a team of 6 engineers")).toBe(false);
    expect(appearsIn(RESUME, "Built dashboards with Vue")).toBe(false);
    expect(appearsIn(RESUME, "")).toBe(false);
  });
});

describe("verifyAssessments", () => {
  const requirements = [req("R1"), req("R2"), req("R3")];

  it("discards unverifiable quotes and downgrades matches left without evidence", () => {
    const result = verifyAssessments(
      [
        { requirementId: "R1", match: "strong", evidence: ["Wrote unit tests with Jest"], rationale: "ok" },
        { requirementId: "R2", match: "partial", evidence: ["Managed AWS infrastructure"], rationale: "invented" },
      ],
      requirements,
      RESUME,
    );
    expect(result[0]).toMatchObject({ match: "strong", downgraded: false, discardedEvidence: [] });
    expect(result[1]).toMatchObject({ match: "none", downgraded: true, evidence: [], discardedEvidence: ["Managed AWS infrastructure"] });
  });

  it("treats requirements the model skipped as no evidence", () => {
    const result = verifyAssessments([], requirements, RESUME);
    expect(result).toHaveLength(3);
    expect(result.every((a) => a.match === "none")).toBe(true);
  });
});

describe("analyzeKeywords", () => {
  it("matches whole terms only and de-duplicates", () => {
    const result = analyzeKeywords(["Java", "JavaScript", "javascript", "PostgreSQL", "MongoDB", "React"], RESUME);
    expect(result.found).toEqual(["JavaScript", "PostgreSQL", "React"]);
    expect(result.missing).toEqual(["Java", "MongoDB"]);
  });
});

describe("precheckRecommendation", () => {
  it("passes a faithful rewrite", () => {
    expect(precheckRecommendation(rec({}), RESUME)).toEqual([]);
  });

  it("flags an original that is not in the resume", () => {
    expect(precheckRecommendation(rec({ original: "Led the platform team." }), RESUME)).toContain("original_not_in_resume");
  });

  it("flags numbers that do not appear anywhere in the resume", () => {
    expect(precheckRecommendation(rec({ suggested: "Wrote Jest tests reaching 95% coverage for 6 engineers." }), RESUME)).toContain(
      "fabricated_metric",
    );
    // 40 and 6 both exist in the resume, so reusing them is allowed.
    expect(precheckRecommendation(rec({ suggested: "Cut load time 40% for a team of 6." }), RESUME)).toEqual([]);
  });

  it("does not treat digits inside identifiers as metrics", () => {
    expect(precheckRecommendation(rec({ suggested: "Wrote Jest unit tests for EC2 and S3 code for 6 engineers." }), RESUME)).not.toContain(
      "fabricated_metric",
    );
  });

  it("flags leadership or ownership verbs the resume never uses", () => {
    expect(precheckRecommendation(rec({ suggested: "Led unit testing with Jest for a team of 6 engineers." }), RESUME)).toContain(
      "exaggerated_responsibility",
    );
    expect(precheckRecommendation(rec({ suggested: "Owned the Jest unit test suite for 6 engineers." }), RESUME)).toContain(
      "exaggerated_responsibility",
    );
    // Hyphenated compounds are not leadership verbs (regression: "self-directed" matched "directed").
    expect(precheckRecommendation(rec({ suggested: "Wrote self-directed Jest unit tests for a team of 6 engineers." }), RESUME)).toEqual([]);
    // Allowed when the resume already uses the verb.
    const resumeWithLed = `${RESUME}\n- Led the migration to Jest.`;
    expect(precheckRecommendation(rec({ suggested: "Led unit testing with Jest for a team of 6 engineers." }), resumeWithLed)).toEqual([]);
  });
});
