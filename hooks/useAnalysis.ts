"use client";

import { useCallback, useRef, useState } from "react";
import { STAGES } from "@/lib/constants";
import type { AnalysisEvent, AnalysisReport, StageId, StageStatus } from "@/types/analysis";

export interface StageState {
  status: StageStatus;
  message?: string;
}

export type AnalysisPhase = "idle" | "running" | "done" | "error";

const initialStages = (): Record<StageId, StageState> =>
  Object.fromEntries(STAGES.map((s) => [s.id, { status: "waiting" }])) as Record<StageId, StageState>;

/** Calls /api/analyze and consumes its NDJSON event stream. */
export function useAnalysis() {
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [stages, setStages] = useState(initialStages);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: AnalysisEvent) => {
    switch (event.type) {
      case "stage":
        setStages((prev) => ({ ...prev, [event.stage]: { status: event.status, message: event.message } }));
        break;
      case "result":
        setReport(event.report);
        setPhase("done");
        break;
      case "error":
        setError(event.message);
        setPhase("error");
        break;
    }
  }, []);

  const start = useCallback(
    async (resume: string, jobDescription: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setPhase("running");
      setStartedAt(Date.now());
      setStages(initialStages());
      setReport(null);
      setError(null);

      let receivedTerminal = false;
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.message ?? `Request failed (${response.status}).`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            let event: AnalysisEvent;
            try {
              event = JSON.parse(line) as AnalysisEvent;
            } catch {
              throw new Error("Received an unreadable response from the server. Please try again.");
            }
            if (event.type !== "stage") receivedTerminal = true;
            handleEvent(event);
          }
        }

        if (!receivedTerminal) throw new Error("The connection closed before the analysis finished.");
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof TypeError
            ? "Network error: could not reach the server. Check your connection and try again."
            : err instanceof Error
              ? err.message
              : "Something went wrong.";
        setError(message);
        setPhase("error");
        // Mark whatever was in flight as failed so the tracker doesn't spin forever.
        setStages((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([id, s]) => [id, s.status === "processing" ? { status: "failed" } : s]),
          ) as Record<StageId, StageState>,
        );
      }
    },
    [handleEvent],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setStartedAt(null);
    setStages(initialStages());
    setReport(null);
    setError(null);
  }, []);

  return { phase, stages, report, error, startedAt, start, reset };
}
