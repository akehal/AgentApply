import type { z } from "zod";
import type {
  AssessmentSchema,
  EvidenceSchema,
  KeyRequirementSchema,
  MatchLevelSchema,
  RecommendationSchema,
  RecommendationsSchema,
  RequirementCategorySchema,
  RequirementsSchema,
  ScoringInsightsSchema,
  ValidationIssueSchema,
  ValidationSchema,
} from "@/lib/schemas";
import type { StageId } from "@/lib/constants";

export type { StageId };

// ---------- Raw agent outputs (inferred from the Zod schemas) ----------

export type Requirements = z.infer<typeof RequirementsSchema>;
export type RequirementCategory = z.infer<typeof RequirementCategorySchema>;
export type KeyRequirement = z.infer<typeof KeyRequirementSchema>;
export type MatchLevel = z.infer<typeof MatchLevelSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export type EvidenceOutput = z.infer<typeof EvidenceSchema>;
export type ScoringInsights = z.infer<typeof ScoringInsightsSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type RecommendationsOutput = z.infer<typeof RecommendationsSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type ValidationOutput = z.infer<typeof ValidationSchema>;

// ---------- Post-processed data used by later stages and the UI ----------

/** An assessment after deterministic quote verification against the resume. */
export interface VerifiedAssessment extends Assessment {
  requirement: KeyRequirement;
  /** Quotes the model returned that could not be found in the resume. */
  discardedEvidence: string[];
  /** True when the match level was lowered because no quote could be verified. */
  downgraded: boolean;
}

export interface KeywordAnalysis {
  found: string[];
  missing: string[];
}

export interface DimensionScore {
  key: "technical" | "experience" | "keywords" | "education";
  label: string;
  /** 0–100, or null when the job description has no criteria for this dimension. */
  score: number | null;
  weight: number;
  basis: string;
}

export interface Scores {
  overall: number;
  dimensions: DimensionScore[];
  method: string;
}

export type RecommendationStatus = "approved" | "rejected";

export interface ValidatedRecommendation extends Recommendation {
  status: RecommendationStatus;
  issues: ValidationIssue[];
  validationReason: string;
  /** Raw verdict from the AI critic, before deterministic hard-fail rules are applied. */
  aiVerdict: RecommendationStatus | "missing";
  /** Issues flagged by the deterministic pre-checks. */
  precheckIssues: ValidationIssue[];
}

export interface ValidationReport {
  summary: string;
  confidence: ValidationOutput["confidence"];
  approvedCount: number;
  rejectedCount: number;
}

export interface AnalysisReport {
  requirements: Requirements;
  assessments: VerifiedAssessment[];
  evidenceSummary: string;
  keywords: KeywordAnalysis;
  scores: Scores;
  scoringInsights: ScoringInsights;
  recommendations: ValidatedRecommendation[];
  unaddressableGaps: RecommendationsOutput["unaddressableGaps"];
  validation: ValidationReport;
  meta: {
    model: string;
    durationMs: number;
    stageDurationsMs: Partial<Record<StageId, number>>;
  };
}

// ---------- Streaming protocol between the API route and the browser ----------

export type StageStatus = "waiting" | "processing" | "complete" | "failed";

export type AnalysisEvent =
  | { type: "stage"; stage: StageId; status: Exclude<StageStatus, "waiting">; message?: string }
  | { type: "result"; report: AnalysisReport }
  | { type: "error"; code: string; message: string };

export interface AnalyzeRequestBody {
  resume: string;
  jobDescription: string;
}
