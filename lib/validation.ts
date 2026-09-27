// Deterministic guardrails. These run in code (no AI) so they are cheap,
// repeatable, and cannot be talked out of their conclusions by the model.

import { INPUT_LIMITS } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import type {
  AnalyzeRequestBody,
  Assessment,
  KeyRequirement,
  KeywordAnalysis,
  Recommendation,
  ValidationIssue,
  VerifiedAssessment,
} from "@/types/analysis";

// ---------- Request input ----------

export function parseAnalyzeRequest(body: unknown): AnalyzeRequestBody {
  if (typeof body !== "object" || body === null) {
    throw new AppError("invalid_request", "Request body must be a JSON object.", 400);
  }
  const { resume, jobDescription } = body as Record<string, unknown>;
  if (typeof resume !== "string" || typeof jobDescription !== "string") {
    throw new AppError("invalid_request", "Both resume and jobDescription must be text.", 400);
  }

  const cleanResume = resume.trim();
  const cleanJob = jobDescription.trim();
  const error = getInputError(cleanResume, cleanJob);
  if (error) throw new AppError("invalid_input", error, 400);

  return { resume: cleanResume, jobDescription: cleanJob };
}

/** Shared by the client (instant feedback) and the server (enforcement). */
export function getInputError(resume: string, jobDescription: string): string | null {
  if (!resume.trim()) return "Please paste your resume.";
  if (!jobDescription.trim()) return "Please paste the job description.";
  if (resume.trim().length < INPUT_LIMITS.minChars) {
    return `The resume looks too short (minimum ${INPUT_LIMITS.minChars} characters).`;
  }
  if (jobDescription.trim().length < INPUT_LIMITS.minChars) {
    return `The job description looks too short (minimum ${INPUT_LIMITS.minChars} characters).`;
  }
  if (resume.length > INPUT_LIMITS.resumeMaxChars) {
    return `The resume is too long (maximum ${INPUT_LIMITS.resumeMaxChars.toLocaleString()} characters).`;
  }
  if (jobDescription.length > INPUT_LIMITS.jobDescriptionMaxChars) {
    return `The job description is too long (maximum ${INPUT_LIMITS.jobDescriptionMaxChars.toLocaleString()} characters).`;
  }
  return null;
}

// ---------- Text matching helpers ----------

/** Lowercase, unify quotes/dashes, strip bullets and punctuation, collapse whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[•▪◦●·*]/g, " ")
    .replace(/[^\p{L}\p{N}+#%$.\-/ ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `quote` appears in `source`, tolerating formatting differences. */
export function appearsIn(source: string, quote: string): boolean {
  const needle = normalizeText(quote).replace(/[.\s]+$/, "");
  if (needle.length < 3) return false;
  return normalizeText(source).includes(needle);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-term match so "Java" does not match "JavaScript".
 * With `hyphenJoins`, hyphenated compounds count as one word ("self-directed" does not contain "directed").
 */
function containsTerm(normalizedSource: string, term: string, hyphenJoins = false): boolean {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  const word = hyphenJoins ? "\\p{L}\\p{N}\\-" : "\\p{L}\\p{N}";
  const pattern = new RegExp(`(^|[^${word}])${escapeRegExp(normalizedTerm)}(?=$|[^${word}])`, "u");
  return pattern.test(normalizedSource);
}

// ---------- Stage 2 guardrail: every piece of evidence must be a real quote ----------

export function verifyAssessments(
  assessments: Assessment[],
  requirements: KeyRequirement[],
  resume: string,
): VerifiedAssessment[] {
  const byId = new Map(assessments.map((a) => [a.requirementId, a]));

  // Iterate over requirements (not assessments) so every requirement is
  // covered exactly once, even if the model skipped or duplicated one.
  return requirements.map((requirement) => {
    const assessment = byId.get(requirement.id);
    if (!assessment) {
      return {
        requirementId: requirement.id,
        requirement,
        match: "none",
        evidence: [],
        discardedEvidence: [],
        rationale: "The evidence agent did not assess this requirement, so no match is assumed.",
        downgraded: false,
      };
    }

    const verified = assessment.evidence.filter((quote) => appearsIn(resume, quote));
    const discarded = assessment.evidence.filter((quote) => !appearsIn(resume, quote));
    const downgraded = assessment.match !== "none" && verified.length === 0;

    return {
      ...assessment,
      requirement,
      evidence: verified,
      discardedEvidence: discarded,
      match: downgraded ? "none" : assessment.match,
      rationale: downgraded
        ? `${assessment.rationale} [Downgraded to "no evidence": none of the cited quotes could be found in the resume.]`
        : assessment.rationale,
      downgraded,
    };
  });
}

// ---------- Keyword analysis (deterministic) ----------

export function analyzeKeywords(keywords: string[], resume: string): KeywordAnalysis {
  const normalizedResume = normalizeText(resume);
  // De-duplicate case-insensitively, keeping the posting's first spelling.
  const unique = new Map<string, string>();
  for (const keyword of keywords.map((k) => k.trim()).filter(Boolean)) {
    if (!unique.has(keyword.toLowerCase())) unique.set(keyword.toLowerCase(), keyword);
  }
  const found: string[] = [];
  const missing: string[] = [];
  for (const keyword of unique.values()) {
    (containsTerm(normalizedResume, keyword) ? found : missing).push(keyword);
  }
  return { found, missing };
}

// ---------- Stage 4/5 guardrail: pre-screen recommendations ----------

// Standalone numbers only: "40%", "5+", "1.5" count; digits inside identifiers ("EC2", "S3", "B2B") do not.
const NUMBER_PATTERN = /(?<![\p{L}\d])\d+(?:\.\d+)?(?![\p{L}\d])/gu;

// Verbs that claim leadership or ownership. A suggestion may only use one if
// the resume already uses it somewhere.
const ESCALATION_TERMS = [
  "led", "lead", "leading", "owned", "owner", "managed", "manager", "managing",
  "mentored", "mentoring", "supervised", "directed", "headed", "spearheaded",
  "oversaw", "architected", "championed",
];

/**
 * Checks that do not need judgement:
 * - the "original" text must actually exist in the resume;
 * - the suggestion must not introduce numbers that appear nowhere in the resume;
 * - the suggestion must not introduce leadership/ownership verbs the resume never uses.
 */
export function precheckRecommendation(rec: Recommendation, resume: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!appearsIn(resume, rec.original)) issues.push("original_not_in_resume");

  const normalizedResume = normalizeText(resume);
  const normalizedSuggested = normalizeText(rec.suggested);

  const resumeNumbers = new Set(normalizedResume.match(NUMBER_PATTERN) ?? []);
  const newNumbers = (normalizedSuggested.match(NUMBER_PATTERN) ?? []).filter((n) => !resumeNumbers.has(n));
  if (newNumbers.length > 0) issues.push("fabricated_metric");

  const escalated = ESCALATION_TERMS.some(
    (term) => containsTerm(normalizedSuggested, term, true) && !containsTerm(normalizedResume, term, true),
  );
  if (escalated) issues.push("exaggerated_responsibility");

  return issues;
}
