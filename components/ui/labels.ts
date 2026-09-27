import type { Tone } from "./primitives";
import type { MatchLevel, ValidationIssue } from "@/types/analysis";

export const MATCH_LABELS: Record<MatchLevel, { label: string; short: string; tone: Tone }> = {
  strong: { label: "Strong match", short: "strong", tone: "green" },
  partial: { label: "Partial match", short: "partial", tone: "amber" },
  transferable: { label: "Transferable", short: "transferable", tone: "sky" },
  none: { label: "No evidence", short: "no evidence", tone: "rose" },
};

export const SEVERITY_TONE: Record<"critical" | "moderate" | "minor", Tone> = {
  critical: "rose",
  moderate: "amber",
  minor: "zinc",
};

export const ISSUE_LABELS: Record<ValidationIssue, string> = {
  unsupported_skill: "Unsupported skill",
  invented_experience: "Invented experience",
  fabricated_metric: "Fabricated metric",
  exaggerated_responsibility: "Exaggerated responsibility",
  misleading_wording: "Misleading wording",
  unsupported_technology: "Unsupported technology",
  contradiction: "Contradiction",
  original_not_in_resume: "Original not in resume",
};

export type ScoreTone = Extract<Tone, "green" | "amber" | "rose">;

export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return "green";
  if (score >= 50) return "amber";
  return "rose";
}
