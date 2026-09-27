import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runAnalysis } from "@/lib/agents/orchestrator";
import { toAppError } from "@/lib/errorMapping";
import type { AnalysisEvent, AnalysisReport, StageId } from "@/types/analysis";

export interface PipelineRun {
  ok: boolean;
  wallClockMs: number;
  report?: AnalysisReport;
  stagesCompleted: StageId[];
  stagesFailed: StageId[];
  errorCode?: string;
  errorMessage?: string;
}

/** Runs the complete five-stage workflow exactly as the API route does. */
export async function runPipeline(resume: string, jobDescription: string): Promise<PipelineRun> {
  const events: AnalysisEvent[] = [];
  const t0 = Date.now();
  try {
    const report = await runAnalysis({ resume, jobDescription }, (e) => events.push(e));
    return { ok: true, wallClockMs: Date.now() - t0, report, ...stageSummary(events) };
  } catch (error) {
    const appError = toAppError(error);
    return {
      ok: false,
      wallClockMs: Date.now() - t0,
      ...stageSummary(events),
      errorCode: appError.code,
      errorMessage: error instanceof Error ? error.message.slice(0, 300) : String(error),
    };
  }
}

function stageSummary(events: AnalysisEvent[]) {
  const stages = events.filter((e): e is Extract<AnalysisEvent, { type: "stage" }> => e.type === "stage");
  return {
    stagesCompleted: stages.filter((e) => e.status === "complete").map((e) => e.stage),
    stagesFailed: stages.filter((e) => e.status === "failed").map((e) => e.stage),
  };
}

/** Runs async tasks with a fixed concurrency limit, preserving input order. */
export async function pool<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

export function writeResult(name: string, data: unknown): string {
  const dir = path.join(process.cwd(), "evals", "results");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

export function log(message: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);
}
