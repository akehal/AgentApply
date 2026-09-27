// Shared constants. Safe to import from both client and server code — no secrets here.

export const INPUT_LIMITS = {
  minChars: 200,
  resumeMaxChars: 20_000,
  jobDescriptionMaxChars: 15_000,
} as const;

export const UPLOAD_LIMITS = {
  // Vercel rejects request bodies over 4.5 MB, so stay safely below it.
  maxBytes: 4 * 1024 * 1024,
  accept: ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export const STAGES = [
  { id: "requirements", label: "Requirement Extraction", description: "Parses the job description into structured requirements." },
  { id: "evidence", label: "Evidence Matching", description: "Classifies each requirement against quoted resume evidence." },
  { id: "scoring", label: "Scoring", description: "Computes explainable alignment scores and prioritises gaps." },
  { id: "recommendations", label: "Recommendations", description: "Proposes resume edits grounded only in existing content." },
  { id: "validation", label: "Validation", description: "Independently audits every recommendation for fabrication." },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export const AI_DISCLAIMER =
  "This is an AI-generated alignment estimate, not an actual employer or ATS score. Use it as guidance, not a prediction of hiring outcomes.";

export const PRIVACY_NOTICE =
  "Your resume and job description are sent to the AI provider for analysis. Avoid including information you do not want processed.";
