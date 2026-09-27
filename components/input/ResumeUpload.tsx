"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { useResumeUpload } from "@/hooks/useResumeUpload";
import { cx } from "@/components/ui/primitives";

/**
 * Wraps the resume field: accepts a dropped PDF/.docx anywhere over it, or a file
 * chosen via the button, and fills the field with the extracted text for review.
 */
export function ResumeUpload({ onText, children }: { onText: (text: string) => void; children: ReactNode }) {
  const { state, upload } = useResumeUpload(onText);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void upload(file);
  };

  return (
    <div
      className="relative flex min-w-0 flex-col"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {children}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={state.status === "extracting"}
          className="rounded-md border border-white/10 px-2.5 py-1 text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          Upload PDF or Word file
        </button>
        <UploadStatus state={state} />
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_LIMITS.accept}
          className="sr-only"
          tabIndex={-1}
          aria-label="Upload resume file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {(dragging || state.status === "extracting") && (
        <div
          className={cx(
            "pointer-events-none absolute inset-0 grid place-items-center rounded-xl border-2 border-dashed text-sm font-medium",
            dragging ? "border-accent/70 bg-accent/10 text-accent" : "border-white/20 bg-black/60 text-zinc-200",
          )}
        >
          {dragging ? "Drop your PDF or Word resume" : "Extracting text…"}
        </div>
      )}
    </div>
  );
}

function UploadStatus({ state }: { state: ReturnType<typeof useResumeUpload>["state"] }) {
  switch (state.status) {
    case "idle":
      return <span className="text-zinc-500">or drop one onto the box · max 4 MB</span>;
    case "extracting":
      return <span className="text-zinc-400">Reading {state.fileName}…</span>;
    case "done":
      return (
        <span className="text-emerald-300/90" role="status">
          Extracted from {state.fileName} ({state.detail}). Review the text before analyzing.
        </span>
      );
    case "error":
      return (
        <span className="text-rose-300" role="alert">
          {state.message}
        </span>
      );
  }
}
