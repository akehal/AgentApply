"use client";

import { useCallback, useState } from "react";
import { UPLOAD_LIMITS } from "@/lib/constants";

export type UploadState =
  | { status: "idle" }
  | { status: "extracting"; fileName: string }
  | { status: "done"; fileName: string; detail: string }
  | { status: "error"; message: string };

interface ExtractResponse {
  text: string;
  format: "pdf" | "docx";
  pages: number | null;
}

/** Sends a resume file to /api/extract and hands the plain text back via `onText`. */
export function useResumeUpload(onText: (text: string) => void) {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const upload = useCallback(
    async (file: File) => {
      // Cheap client-side checks for instant feedback; the server re-checks everything.
      if (!/\.(pdf|docx)$/i.test(file.name)) {
        setState({ status: "error", message: "Please choose a PDF or Word (.docx) file." });
        return;
      }
      if (file.size > UPLOAD_LIMITS.maxBytes) {
        setState({ status: "error", message: "The file is larger than 4 MB." });
        return;
      }

      setState({ status: "extracting", fileName: file.name });
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/extract", { method: "POST", body });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          setState({ status: "error", message: data?.message ?? "The file could not be read." });
          return;
        }
        const { text, format, pages } = data as ExtractResponse;
        onText(text);
        const detail = format === "pdf" && pages ? `${pages} page${pages === 1 ? "" : "s"}` : format.toUpperCase();
        setState({ status: "done", fileName: file.name, detail });
      } catch {
        setState({ status: "error", message: "Network error while uploading. Please try again." });
      }
    },
    [onText],
  );

  return { state, upload };
}
