"use client";

import { useEffect, useState } from "react";
import { STAGES } from "@/lib/constants";
import type { AnalysisPhase, StageState } from "@/hooks/useAnalysis";
import type { StageId, StageStatus } from "@/types/analysis";
import { Card, cx } from "@/components/ui/primitives";

const STATUS_TEXT: Record<StageStatus, string> = {
  waiting: "Waiting",
  processing: "Processing…",
  complete: "Complete",
  failed: "Failed",
};

const PARALLEL_STAGES: StageId[] = ["scoring", "recommendations"];

interface StageTrackerProps {
  stages: Record<StageId, StageState>;
  phase: AnalysisPhase;
  startedAt: number | null;
  /** Server-measured total once the analysis has finished. */
  completedInMs?: number;
}

export function StageTracker({ stages, phase, startedAt, completedInMs }: StageTrackerProps) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-100">Agent Pipeline</h2>
        <PipelineStatus phase={phase} startedAt={startedAt} completedInMs={completedInMs} />
      </div>
      <ol className="grid gap-2 lg:grid-cols-5 lg:gap-3" aria-live="polite">
        {STAGES.map((stage, index) => {
          const state = stages[stage.id];
          return (
            <li
              key={stage.id}
              className={cx(
                "flex items-start gap-3 rounded-xl border p-3 transition-colors lg:flex-col lg:gap-0 lg:p-3.5",
                state.status === "waiting" && "border-white/[0.06] bg-white/[0.02]",
                state.status === "processing" && "border-accent/40 bg-accent/[0.06]",
                state.status === "complete" && "border-emerald-400/25 bg-emerald-400/[0.05]",
                state.status === "failed" && "border-rose-400/30 bg-rose-400/[0.06]",
              )}
            >
              <div className="flex shrink-0 items-center gap-2 pt-0.5 lg:pt-0">
                <StatusIcon status={state.status} />
                <span className="font-mono text-[11px] text-zinc-500">0{index + 1}</span>
              </div>
              <div className="min-w-0 lg:mt-2">
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-zinc-100">
                  {stage.label}
                  {PARALLEL_STAGES.includes(stage.id) && (
                    <span className="text-[10px] font-normal uppercase tracking-wider text-zinc-500">parallel</span>
                  )}
                </p>
                <p
                  className={cx(
                    "mt-0.5 text-xs lg:mt-1",
                    state.status === "failed" ? "text-rose-300" : state.status === "complete" ? "text-zinc-400" : "text-zinc-500",
                  )}
                >
                  {state.message ?? (phase === "error" && state.status === "waiting" ? "Not started" : STATUS_TEXT[state.status])}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/** Honest progress context: elapsed time and a typical duration, never a fake percentage. */
function PipelineStatus({ phase, startedAt, completedInMs }: Omit<StageTrackerProps, "stages">) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  if (phase === "done" && completedInMs != null) {
    return <p className="text-xs text-zinc-400">Completed in {(completedInMs / 1000).toFixed(0)}s</p>;
  }
  if (phase === "running" && startedAt != null) {
    const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
    return (
      <p className="text-xs text-zinc-400">
        <span className="font-mono tabular-nums text-zinc-200">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>{" "}
        elapsed · usually 1–2 minutes
      </p>
    );
  }
  if (phase === "error") return <p className="text-xs text-rose-300">Stopped</p>;
  return null;
}

function StatusIcon({ status }: { status: StageStatus }) {
  const label = STATUS_TEXT[status];
  if (status === "processing") {
    return (
      <span role="img" aria-label={label} className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
    );
  }
  if (status === "complete") {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 16 16" className="h-4 w-4 text-emerald-400" fill="currentColor">
        <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.5 5.3a.75.75 0 00-1.06 0L7 8.74 5.56 7.3a.75.75 0 10-1.06 1.06l2 2a.75.75 0 001.06 0l4-4a.75.75 0 000-1.06z" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 16 16" className="h-4 w-4 text-rose-400" fill="currentColor">
        <path d="M8 0a8 8 0 110 16A8 8 0 018 0zM5.8 4.74a.75.75 0 10-1.06 1.06L6.94 8l-2.2 2.2a.75.75 0 101.06 1.06L8 9.06l2.2 2.2a.75.75 0 101.06-1.06L9.06 8l2.2-2.2a.75.75 0 10-1.06-1.06L8 6.94 5.8 4.74z" />
      </svg>
    );
  }
  return <span role="img" aria-label={label} className="h-4 w-4 rounded-full border-2 border-zinc-600" />;
}
