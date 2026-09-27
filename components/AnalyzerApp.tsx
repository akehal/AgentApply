"use client";

import { useState } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { getInputError } from "@/lib/validation";
import { IntroHero } from "@/components/IntroHero";
import { InputForm } from "@/components/input/InputForm";
import { StageTracker } from "@/components/progress/StageTracker";
import { ResultsView } from "@/components/results/ResultsView";
import { Button } from "@/components/ui/primitives";

/** Top-level client state machine: idle (input) → running → done | error. */
export function AnalyzerApp() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const { phase, stages, report, error, startedAt, start, reset } = useAnalysis();

  const handleSubmit = () => {
    setShowErrors(true);
    if (getInputError(resume, jobDescription)) return;
    void start(resume, jobDescription);
  };

  if (phase === "idle") {
    return (
      <>
        <IntroHero />
        <InputForm
          resume={resume}
          jobDescription={jobDescription}
          onResumeChange={setResume}
          onJobDescriptionChange={setJobDescription}
          onSubmit={handleSubmit}
          showErrors={showErrors}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <StageTracker stages={stages} phase={phase} startedAt={startedAt} completedInMs={report?.meta.durationMs} />

      {phase === "running" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">Results appear once every stage has finished. Nothing is shown before it is real.</p>
          <Button onClick={reset}>Cancel</Button>
        </div>
      )}

      {phase === "error" && (
        <div role="alert" className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] p-5">
          <p className="font-medium text-rose-200">Analysis failed</p>
          <p className="mt-1 text-sm text-rose-200/80">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={() => void start(resume, jobDescription)}>
              Retry
            </Button>
            <Button onClick={reset}>Edit inputs</Button>
          </div>
        </div>
      )}

      {phase === "done" && report && (
        <>
          <ResultsView report={report} />
          <div className="flex justify-center pt-2">
            <Button onClick={reset}>Start a new analysis</Button>
          </div>
        </>
      )}
    </div>
  );
}
