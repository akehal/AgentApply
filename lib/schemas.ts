import { z } from "zod";

// Zod schemas are the single source of truth for every agent's output.
// They are sent to Claude as JSON Schema (structured outputs) AND used to
// validate the response before it is passed to the next stage.

// ---------- Stage 1: Requirement Extraction ----------

export const RequirementCategorySchema = z.enum([
  "technical",
  "experience",
  "education",
  "soft_skill",
  "domain",
]);

export const KeyRequirementSchema = z.object({
  id: z.string().describe("Short stable id such as R1, R2, ..."),
  requirement: z.string().describe("One concrete, checkable requirement."),
  category: RequirementCategorySchema,
  importance: z.enum(["required", "preferred"]),
});

export const RequirementsSchema = z.object({
  jobTitle: z.string().nullable(),
  company: z.string().nullable(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  technologies: z.array(z.string()),
  responsibilities: z.array(z.string()),
  experienceRequirements: z.array(z.string()),
  educationRequirements: z.array(z.string()),
  atsKeywords: z.array(z.string()),
  softSkills: z.array(z.string()),
  keyRequirements: z.array(KeyRequirementSchema),
});

// ---------- Stage 2: Evidence Matching ----------

export const MatchLevelSchema = z.enum(["strong", "partial", "transferable", "none"]);

export const AssessmentSchema = z.object({
  requirementId: z.string(),
  match: MatchLevelSchema,
  evidence: z
    .array(z.string())
    .describe("Exact verbatim quotes copied from the resume. Empty when match is none."),
  rationale: z.string(),
});

export const EvidenceSchema = z.object({
  assessments: z.array(AssessmentSchema),
  summary: z.string(),
});

// ---------- Stage 3: Scoring (AI interpretation of deterministic scores) ----------

export const ScoringInsightsSchema = z.object({
  strongestMatches: z.array(
    z.object({ requirementId: z.string(), explanation: z.string() }),
  ),
  partialMatches: z.array(
    z.object({ requirementId: z.string(), explanation: z.string() }),
  ),
  gaps: z.array(
    z.object({
      requirementId: z.string(),
      severity: z.enum(["critical", "moderate", "minor"]),
      explanation: z.string(),
    }),
  ),
  dimensionRationales: z.object({
    technical: z.string(),
    experience: z.string(),
    keywords: z.string(),
    education: z.string(),
  }),
  summary: z.string(),
});

// ---------- Stage 4: Recommendations ----------

export const RecommendationSchema = z.object({
  id: z.string().describe("Short stable id such as REC1, REC2, ..."),
  kind: z.enum(["rewrite", "keyword_alignment", "emphasis"]),
  requirementIds: z.array(z.string()),
  original: z.string().describe("Exact verbatim text copied from the resume."),
  suggested: z.string(),
  reason: z.string(),
});

export const RecommendationsSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  unaddressableGaps: z.array(
    z.object({
      requirementId: z.string(),
      note: z.string().describe("Honest statement that the resume does not show this."),
    }),
  ),
});

// ---------- Stage 5: Validation ----------

export const ValidationIssueSchema = z.enum([
  "unsupported_skill",
  "invented_experience",
  "fabricated_metric",
  "exaggerated_responsibility",
  "misleading_wording",
  "unsupported_technology",
  "contradiction",
  "original_not_in_resume",
]);

export const ValidationSchema = z.object({
  verdicts: z.array(
    z.object({
      recommendationId: z.string(),
      verdict: z.enum(["approved", "rejected"]),
      issues: z.array(ValidationIssueSchema),
      reason: z.string(),
    }),
  ),
  summary: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});
