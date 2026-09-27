import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisEvent } from "@/types/analysis";

// Every agent goes through callStructured, so mocking it lets us inspect
// exactly what each stage sends to the model and control what comes back.
const calls: { agent: string; system: string; user: string; effort: string }[] = [];
let responses: Record<string, unknown>;
let failAgent: string | null = null;

vi.mock("@/lib/anthropic", () => ({
  getModel: () => "test-model",
  callStructured: vi.fn(async (opts: { agent: string; system: string; user: string; effort: string }) => {
    calls.push({ agent: opts.agent, system: opts.system, user: opts.user, effort: opts.effort });
    if (opts.agent === failAgent) throw new Error(`${opts.agent} failed`);
    return structuredClone(responses[opts.agent]);
  }),
}));

const { runAnalysis } = await import("@/lib/agents/orchestrator");

const RESUME_MARKER = "UNIQUE-RESUME-MARKER";
const JOB_MARKER = "UNIQUE-JOB-MARKER";
const resume = `${RESUME_MARKER}\n- Built React dashboards with TypeScript.\n- Wrote unit tests with Jest.`;
const jobDescription = `${JOB_MARKER}\nWe need React, TypeScript and AWS experience.`;

function defaultResponses(): Record<string, unknown> {
  return {
    requirements: {
      jobTitle: "Engineer",
      company: null,
      requiredSkills: ["React"],
      preferredSkills: [],
      technologies: ["React", "AWS"],
      responsibilities: [],
      experienceRequirements: [],
      educationRequirements: [],
      atsKeywords: ["React", "AWS"],
      softSkills: [],
      keyRequirements: [
        { id: "R1", requirement: "React", category: "technical", importance: "required" },
        { id: "R2", requirement: "AWS", category: "technical", importance: "required" },
      ],
    },
    evidence: {
      summary: "s",
      assessments: [
        { requirementId: "R1", match: "strong", evidence: ["Built React dashboards with TypeScript."], rationale: "r" },
        // Hallucinated quote: must be discarded and downgraded before later stages see it.
        { requirementId: "R2", match: "strong", evidence: ["Managed AWS infrastructure"], rationale: "r" },
      ],
    },
    scoring: {
      strongestMatches: [{ requirementId: "R1", explanation: "e" }],
      partialMatches: [],
      gaps: [{ requirementId: "R2", severity: "critical", explanation: "e" }],
      dimensionRationales: { technical: "t", experience: "e", keywords: "k", education: "d" },
      summary: "s",
    },
    recommendations: {
      recommendations: [
        { id: "REC1", kind: "rewrite", requirementIds: ["R1"], original: "Built React dashboards with TypeScript.", suggested: "Built TypeScript React dashboards.", reason: "r" },
        { id: "REC2", kind: "rewrite", requirementIds: ["R2"], original: "Wrote unit tests with Jest.", suggested: "Wrote Jest tests, improving coverage by 30%.", reason: "r" },
        { id: "REC3", kind: "rewrite", requirementIds: ["R2"], original: "Deployed on AWS.", suggested: "Deployed on AWS.", reason: "r" },
        { id: "REC4", kind: "rewrite", requirementIds: ["R1"], original: "Wrote unit tests with Jest.", suggested: "Wrote unit tests in Jest.", reason: "r" },
      ],
      unaddressableGaps: [{ requirementId: "R2", note: "No AWS." }],
    },
    validation: {
      // The AI critic (wrongly) approves REC2 and REC3; code must still reject them. No verdict for REC4.
      verdicts: [
        { recommendationId: "REC1", verdict: "approved", issues: [], reason: "ok" },
        { recommendationId: "REC2", verdict: "approved", issues: [], reason: "ok" },
        { recommendationId: "REC3", verdict: "approved", issues: [], reason: "ok" },
      ],
      summary: "s",
      confidence: "high",
    },
  };
}

beforeEach(() => {
  calls.length = 0;
  responses = defaultResponses();
  failAgent = null;
});

async function run() {
  const events: AnalysisEvent[] = [];
  const report = await runAnalysis({ resume, jobDescription }, (e) => events.push(e));
  return { report, events };
}

describe("stage isolation", () => {
  it("makes exactly five separate model calls, each with its own system prompt", async () => {
    await run();
    expect(calls.map((c) => c.agent).sort()).toEqual(["evidence", "recommendations", "requirements", "scoring", "validation"]);
    expect(new Set(calls.map((c) => c.system)).size).toBe(5);
  });

  it("gives each stage only the context it needs", async () => {
    await run();
    const byAgent = Object.fromEntries(calls.map((c) => [c.agent, c.user]));

    // Stage 1 sees the job description, never the resume.
    expect(byAgent.requirements).toContain(JOB_MARKER);
    expect(byAgent.requirements).not.toContain(RESUME_MARKER);
    // Stage 2 sees requirements + resume, not the raw job description.
    expect(byAgent.evidence).toContain(RESUME_MARKER);
    expect(byAgent.evidence).not.toContain(JOB_MARKER);
    // Stage 3 sees neither raw document.
    expect(byAgent.scoring).not.toContain(RESUME_MARKER);
    expect(byAgent.scoring).not.toContain(JOB_MARKER);
    // Stage 4 sees the resume but not the raw job description.
    expect(byAgent.recommendations).toContain(RESUME_MARKER);
    expect(byAgent.recommendations).not.toContain(JOB_MARKER);
    // Stage 5 (the critic) never sees the job description.
    expect(byAgent.validation).toContain(RESUME_MARKER);
    expect(byAgent.validation).not.toContain(JOB_MARKER);
  });

  it("does not pass hallucinated evidence to later stages", async () => {
    const { report } = await run();
    const r2 = report.assessments.find((a) => a.requirementId === "R2")!;
    expect(r2).toMatchObject({ match: "none", downgraded: true });
    const scoringInput = calls.find((c) => c.agent === "scoring")!.user;
    expect(scoringInput).not.toContain("Managed AWS infrastructure");
  });
});

describe("validation merge", () => {
  it("applies deterministic hard-fails even when the AI critic approves, and rejects missing verdicts", async () => {
    const { report } = await run();
    const byId = Object.fromEntries(report.recommendations.map((r) => [r.id, r]));

    expect(byId.REC1).toMatchObject({ status: "approved", aiVerdict: "approved", precheckIssues: [] });
    expect(byId.REC2).toMatchObject({ status: "rejected", aiVerdict: "approved" });
    expect(byId.REC2.issues).toContain("fabricated_metric");
    expect(byId.REC3).toMatchObject({ status: "rejected", aiVerdict: "approved" });
    expect(byId.REC3.issues).toContain("original_not_in_resume");
    expect(byId.REC4).toMatchObject({ status: "rejected", aiVerdict: "missing" });
    expect(report.validation).toMatchObject({ approvedCount: 1, rejectedCount: 3 });
  });

  it("computes the score in code, not from the model", async () => {
    const { report } = await run();
    // R1 strong (required) + R2 none (required) → technical 50; keywords: React found, AWS missing → 50.
    expect(report.scores.dimensions.find((d) => d.key === "technical")!.score).toBe(50);
    expect(report.scores.overall).toBe(50);
  });
});

describe("progress events and failure handling", () => {
  it("emits processing then complete for all five stages, in dependency order", async () => {
    const { events } = await run();
    const order = events.filter((e) => e.type === "stage").map((e) => `${e.stage}:${e.status}`);
    expect(order.slice(0, 4)).toEqual(["requirements:processing", "requirements:complete", "evidence:processing", "evidence:complete"]);
    expect(order.indexOf("validation:processing")).toBeGreaterThan(order.indexOf("recommendations:complete"));
    for (const stage of ["requirements", "evidence", "scoring", "recommendations", "validation"]) {
      expect(order).toContain(`${stage}:complete`);
    }
  });

  it("marks the failing stage failed and never starts later dependent stages", async () => {
    failAgent = "evidence";
    const events: AnalysisEvent[] = [];
    await expect(runAnalysis({ resume, jobDescription }, (e) => events.push(e))).rejects.toThrow("evidence failed");
    const statuses = events.filter((e) => e.type === "stage").map((e) => `${e.stage}:${e.status}`);
    expect(statuses).toContain("evidence:failed");
    expect(statuses.some((s) => s.startsWith("scoring") || s.startsWith("validation"))).toBe(false);
  });

  it("propagates a parallel-branch failure", async () => {
    failAgent = "scoring";
    const events: AnalysisEvent[] = [];
    await expect(runAnalysis({ resume, jobDescription }, (e) => events.push(e))).rejects.toThrow("scoring failed");
    expect(events).toContainEqual(expect.objectContaining({ stage: "scoring", status: "failed" }));
  });
});
