import { extractDocumentText } from "@/lib/documentText";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { toAppError } from "@/lib/errorMapping";

export const runtime = "nodejs";

/**
 * POST /api/extract (multipart/form-data, field "file")
 * Returns the plain text of an uploaded PDF or .docx resume. No AI call; nothing is stored.
 */
export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    // Allow a little headroom for multipart framing around the file itself.
    if (contentLength > UPLOAD_LIMITS.maxBytes + 64 * 1024) {
      throw new AppError("file_too_large", "The file is larger than 4 MB. Please upload a smaller file.", 413);
    }

    const form = await request.formData().catch(() => {
      throw new AppError("invalid_request", "Expected a file upload.", 400);
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("invalid_request", "No file was uploaded.", 400);

    const { text, format, pages } = await extractDocumentText(new Uint8Array(await file.arrayBuffer()), file.name);
    return Response.json({ text, format, pages, fileName: file.name });
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === "internal_error") {
      console.error("[extract]", error instanceof Error ? error.message : error);
    }
    return Response.json({ code: appError.code, message: appError.message }, { status: appError.status });
  }
}
