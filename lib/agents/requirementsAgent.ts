import { callStructured } from "@/lib/anthropic";
import { AgentOutputError } from "@/lib/errors";
import { RequirementsSchema } from "@/lib/schemas";
import type { Requirements } from "@/types/analysis";

const SYSTEM = `You are the Requirement Extraction agent in a resume-analysis pipeline.
Your only input is a job description. You never see the candidate's resume.

Extract what the employer is asking for, using only information stated or clearly implied in the job description:
- jobTitle / company: exactly as written, or null if not identifiable. Do not guess.
- requiredSkills vs preferredSkills: treat "nice to have", "bonus", "plus", "preferred" as preferred; everything else the role clearly needs is required.
- technologies: named languages, frameworks, tools, platforms, and services.
- responsibilities, experienceRequirements, educationRequirements, softSkills: short phrases.
- atsKeywords: 10–25 distinctive terms an applicant-tracking system would likely match on: named technologies, tools, methodologies, domain terms, and credentials. Use the exact wording from the posting; prefer short terms (1–3 words). Do not include the job title, the company name, or generic phrases (e.g. "test coverage", "communication").
- keyRequirements: the 8–15 most important, concrete, independently checkable requirements, de-duplicated. Give ids R1, R2, ... in order of importance. Assign each a category (technical, experience, education, soft_skill, domain) and importance (required or preferred).

Do not invent requirements that the posting does not support. Return empty arrays where the posting says nothing.`;

export async function runRequirementsAgent(jobDescription: string, signal?: AbortSignal): Promise<Requirements> {
  const result = await callStructured({
    agent: "requirements",
    system: SYSTEM,
    user: `<job_description>\n${jobDescription}\n</job_description>`,
    schema: RequirementsSchema,
    effort: "medium",
    signal,
  });

  if (result.keyRequirements.length === 0) {
    // Downstream stages need at least one criterion to evaluate.
    throw new AgentOutputError("requirements", "no key requirements extracted");
  }

  // Guarantee unique ids even if the model repeated one.
  const seen = new Set<string>();
  result.keyRequirements = result.keyRequirements.map((req, index) => {
    const id = req.id && !seen.has(req.id) ? req.id : `R${index + 1}`;
    seen.add(id);
    return { ...req, id };
  });

  return result;
}
