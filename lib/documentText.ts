import "server-only";
import mammoth from "mammoth";
import { extractTextItems, getDocumentProxy } from "unpdf";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { AppError } from "@/lib/errors";

// Resume file → plain text. Runs locally on the server with open-source parsers;
// no AI call is made and nothing is stored. The extracted text is returned to the
// browser so the user can review and edit it before analysis.

export type DocumentFormat = "pdf" | "docx";

export interface ExtractedDocument {
  text: string;
  format: DocumentFormat;
  /** Page count for PDFs; Word documents have no fixed pages. */
  pages: number | null;
}

// Far above any real resume; keeps a pathological file from producing a huge response.
const MAX_EXTRACTED_CHARS = 60_000;

/** Identify the format from the file's leading bytes, not its name or claimed MIME type. */
export function detectFormat(bytes: Uint8Array, fileName: string): DocumentFormat {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);

  if (startsWith(0x25, 0x50, 0x44, 0x46)) return "pdf"; // "%PDF"
  if (startsWith(0x50, 0x4b, 0x03, 0x04) && /\.docx$/i.test(fileName)) return "docx"; // ZIP container
  if (startsWith(0xd0, 0xcf, 0x11, 0xe0)) {
    throw new AppError("unsupported_file", "Older Word (.doc) files aren't supported. Save it as .docx or PDF and try again.", 415);
  }
  throw new AppError("unsupported_file", "Please upload a PDF or Word (.docx) file.", 415);
}

/** Tidy extracted text so it reads like the original resume. */
export function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractedDocument> {
  let pdf;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new AppError("encrypted_file", "This PDF is password-protected. Remove the password or paste the text instead.", 422);
    }
    throw new AppError("unreadable_file", "This PDF could not be read. Try exporting it again, or paste the text instead.", 422);
  }

  // Rebuild line breaks from PDF.js end-of-line markers so bullets stay on their own lines.
  const { totalPages, items } = await extractTextItems(pdf);
  const text = items
    .map((page) => page.map((item) => item.str + (item.hasEOL ? "\n" : "")).join(""))
    .join("\n\n");
  return { text: cleanExtractedText(text), format: "pdf", pages: totalPages };
}

async function extractDocx(bytes: Uint8Array): Promise<ExtractedDocument> {
  try {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { text: cleanExtractedText(value), format: "docx", pages: null };
  } catch {
    throw new AppError("unreadable_file", "This Word document could not be read. Try saving it again, or paste the text instead.", 422);
  }
}

export async function extractDocumentText(bytes: Uint8Array, fileName: string): Promise<ExtractedDocument> {
  if (bytes.byteLength === 0) throw new AppError("empty_file", "The file is empty.", 400);
  if (bytes.byteLength > UPLOAD_LIMITS.maxBytes) {
    throw new AppError("file_too_large", "The file is larger than 4 MB. Please upload a smaller file.", 413);
  }

  const format = detectFormat(bytes, fileName);
  const result = format === "pdf" ? await extractPdf(bytes) : await extractDocx(bytes);

  if (!result.text) {
    throw new AppError(
      "no_text_found",
      format === "pdf"
        ? "No selectable text was found. The PDF may be a scanned image. Please paste the text instead."
        : "No text was found in this document.",
      422,
    );
  }
  return result;
}
