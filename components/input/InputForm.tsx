"use client";

import { INPUT_LIMITS, PRIVACY_NOTICE } from "@/lib/constants";
import { DEMO_JOB_DESCRIPTION, DEMO_RESUME } from "@/lib/demoData";
import { getInputError } from "@/lib/validation";
import { Button, Card } from "@/components/ui/primitives";
import { ResumeUpload } from "./ResumeUpload";
import { TextAreaField } from "./TextAreaField";

interface InputFormProps {
  resume: string;
  jobDescription: string;
  onResumeChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  /** Show the validation message only after the first submit attempt. */
  showErrors: boolean;
}

export function InputForm({ resume, jobDescription, onResumeChange, onJobDescriptionChange, onSubmit, showErrors }: InputFormProps) {
  const inputError = getInputError(resume, jobDescription);

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <ResumeUpload onText={onResumeChange}>
            <TextAreaField
              id="resume"
              label="Resume"
              hint="Paste plain text, or upload a PDF or Word file. Files are only read to extract their text and are never stored."
              value={resume}
              maxChars={INPUT_LIMITS.resumeMaxChars}
              placeholder="Paste your resume here, or drop a PDF or Word (.docx) file…"
              onChange={onResumeChange}
            />
          </ResumeUpload>
          <TextAreaField
            id="job-description"
            label="Job Description"
            hint="Include requirements, responsibilities, and nice-to-haves."
            value={jobDescription}
            maxChars={INPUT_LIMITS.jobDescriptionMaxChars}
            placeholder="Paste the job description here…"
            onChange={onJobDescriptionChange}
          />
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-xl items-start gap-2 text-xs leading-relaxed text-zinc-400">
            <ShieldIcon />
            {PRIVACY_NOTICE}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={() => {
                onResumeChange(DEMO_RESUME);
                onJobDescriptionChange(DEMO_JOB_DESCRIPTION);
              }}
            >
              Load Demo
            </Button>
            <Button type="submit" variant="primary">
              Analyze Application
            </Button>
          </div>
        </div>

        {showErrors && inputError && (
          <p role="alert" className="mt-3 text-sm text-rose-400">
            {inputError}
          </p>
        )}
      </form>
    </Card>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 1.5l7 3v5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9v-5l7-3zm0 2.2L5 5.8v3.7c0 3.1 2 5.9 5 6.9 3-1 5-3.8 5-6.9V5.8l-5-2.1z"
        clipRule="evenodd"
      />
    </svg>
  );
}
