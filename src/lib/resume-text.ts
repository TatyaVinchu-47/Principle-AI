/**
 * Extracts plain text from an uploaded resume buffer. Supports PDF (via
 * pdf-parse) and plain text. DOCX and others fall back to empty text (the
 * heuristic/AI layers degrade gracefully). Server-only.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string | null,
  fileName: string | null,
): Promise<string> {
  const name = (fileName || "").toLowerCase();
  const type = (mimeType || "").toLowerCase();

  try {
    if (type.includes("pdf") || name.endsWith(".pdf")) {
      // Lazy import: pdf-parse pulls in test fixtures at module load otherwise.
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return (data.text || "").trim();
    }
    if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
      return buffer.toString("utf8").trim();
    }
  } catch (err) {
    console.error("[resume-text] extraction failed:", err);
  }
  return "";
}
