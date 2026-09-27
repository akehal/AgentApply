import { callStructured } from "@/lib/anthropic";
import { RecommendationsSchema } from "@/lib/schemas";
import type { KeywordAnalysis, RecommendationsOutput, VerifiedAssessment } from "@/types/analysis";

const SYSTEM = `You are the Recommendations agent in a resume-analysis pipeline.
You help a candidate present their REAL experience more effectively for a specific role.

You receive: the candidate's resume, the job requirements with verified evidence classifications, and ATS keywords that are missing from the resume.

Write 3–8 targeted recommendations. Each must:
- quote "original": an exact, verbatim line or phrase copied character-for-character from the resume.
- give "suggested": a rewrite of that text that better surfaces relevant, ALREADY-SUPPORTED experience, or uses the employer's terminology for something the resume already shows.
- give "reason": which requirement(s) it helps and why the change is honest. The reason is shown to the candidate, so name requirements in plain words; never cite internal ids such as "R3".
- set kind: rewrite (clearer/stronger phrasing), keyword_alignment (use the posting's term for something already present), or emphasis (bring relevant existing detail forward).

You must NEVER invent or imply anything the resume does not support, including: skills, technologies, jobs, employers, titles, responsibilities, certifications, achievements, metrics or numbers, projects, education, team sizes, or durations.
- Do not add any number that is not already in the resume.
- Do not upgrade verbs beyond what the original supports (e.g. "assisted with" must not become "led"; "designed" must not become "owned"; "monitored" must not become "owned" or "was responsible for").
- Do not add outcomes, impact, scope, or importance the resume does not state (e.g. "improving performance", "core", "critical", "end to end", "for the X team" when no team is named).
- Do not append labels or parentheticals to job titles.
- "suggested" must be only the replacement resume text. Put advice about ordering or layout in "reason", never in "suggested".
- If a requirement is simply not supported, do NOT write a recommendation for it. Instead add it to unaddressableGaps with an honest note (e.g. "The resume does not show experience with X; consider gaining it or addressing it in a cover letter only if true.").

Use recommendation ids REC1, REC2, ... Only reference requirement ids from the input.`;

export async function runRecommendationAgent(
  resume: string,
  assessments: VerifiedAssessment[],
  keywords: KeywordAnalysis,
  signal?: AbortSignal,
): Promise<RecommendationsOutput> {
  const requirementContext = assessments.map((a) => ({
    id: a.requirementId,
    requirement: a.requirement.requirement,
    importance: a.requirement.importance,
    match: a.match,
    evidence: a.evidence,
  }));

  const result = await callStructured({
    agent: "recommendations",
    system: SYSTEM,
    user:
      `<resume>\n${resume}\n</resume>\n\n` +
      `<requirements>\n${JSON.stringify(requirementContext, null, 2)}\n</requirements>\n\n` +
      `<missing_ats_keywords>\n${keywords.missing.join(", ") || "(none)"}\n</missing_ats_keywords>`,
    schema: RecommendationsSchema,
    effort: "high",
    signal,
  });

  // Guarantee unique recommendation ids so validation verdicts map 1:1.
  const seen = new Set<string>();
  result.recommendations = result.recommendations.map((rec, index) => {
    const id = rec.id && !seen.has(rec.id) ? rec.id : `REC${index + 1}`;
    seen.add(id);
    return { ...rec, id };
  });
  return result;
}
