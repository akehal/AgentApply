import { assertApiKeyConfigured } from "@/lib/anthropic";
import { runAnalysis } from "@/lib/agents/orchestrator";
import { AppError } from "@/lib/errors";
import { toAppError } from "@/lib/errorMapping";
import { parseAnalyzeRequest } from "@/lib/validation";
import type { AnalysisEvent } from "@/types/analysis";

export const runtime = "nodejs";
// Five sequential/parallel model calls can take a few minutes.
export const maxDuration = 300;

const MAX_BODY_BYTES = 200_000;

/**
 * POST /api/analyze
 * Validates input, then streams newline-delimited JSON events (AnalysisEvent)
 * so the UI can show real per-stage progress as it happens.
 */
export async function POST(request: Request) {
  let input;
  try {
    // Reject oversized bodies before parsing them (limits are ~35k chars of text).
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      throw new AppError("payload_too_large", "The submitted text is too long. Please shorten your inputs.", 413);
    }
    const body = await request.json().catch(() => {
      throw new AppError("invalid_request", "Request body must be valid JSON.", 400);
    });
    input = parseAnalyzeRequest(body);
    assertApiKeyConfigured();
  } catch (error) {
    const appError = toAppError(error);
    return Response.json({ code: appError.code, message: appError.message }, { status: appError.status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (event: AnalysisEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          closed = true; // client disconnected
        }
      };

      try {
        const report = await runAnalysis(input, emit, request.signal);
        emit({ type: "result", report });
      } catch (error) {
        const appError = toAppError(error);
        // Log server-side for debugging; the client only receives the safe message.
        console.error(`[analyze] ${appError.code}:`, error instanceof Error ? error.message : error);
        emit({ type: "error", code: appError.code, message: appError.message });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
