import PDFParser from "pdf2json";

// Type definitions for PDF parser
interface PDFText {
  x?: number;
  y?: number;
  R?: Array<{ T: string }>;
}

interface PDFPage {
  Texts?: PDFText[];
}

interface PDFData {
  formImage?: {
    Pages?: PDFPage[];
  };
  Pages?: PDFPage[];
}

// Safe decode that handles malformed URI sequences
function safeDecode(text: string): string {
    try {
        return decodeURIComponent(text);
    } catch {
        // If decoding fails, return the original text
        // Replace common encoded characters manually
        return text
            .replace(/%20/g, " ")
            .replace(/%2C/g, ",")
            .replace(/%2E/g, ".")
            .replace(/%3A/g, ":")
            .replace(/%2F/g, "/")
            .replace(/%40/g, "@")
            .replace(/%26/g, "&")
            .replace(/%3D/g, "=")
            .replace(/%3F/g, "?")
            .replace(/%23/g, "#");
    }
}

/**
 * Extract text from PDF buffer
 * @param buffer - PDF file buffer
 * @returns Extracted text content
 * @throws Error if PDF parsing fails
 */
export async function parsePDF(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const parser = new PDFParser(null, true); // true = raw text mode

        parser.on("pdfParser_dataError", (errData: Error | { parserError: Error }) => {
            console.error("PDF Parser Error:", errData);
            const errorMessage = errData instanceof Error ? errData.message : errData?.parserError?.message || "PDF parsing failed";
            reject(new Error(errorMessage));
        });

        parser.on("pdfParser_dataReady", (pdfData: PDFData) => {
            try {
                // Debug logging
                console.log("PDF Data Keys:", Object.keys(pdfData || {}));

                // Handle both v3 (formImage) and v4 (root) structures
                const pages = pdfData.formImage?.Pages || pdfData.Pages;

                // Validation
                if (!pages || !Array.isArray(pages) || pages.length === 0) {
                    console.error("PDF Parse Failed: No pages found");
                    reject(new Error("PDF Parse Failed: No content found"));
                    return;
                }

                let fullText = "";
                const LINE_Y_TOLERANCE = 0.5; // text items within this vertical delta are on the same line

                // Extraction loop — rebuild line breaks from each text item's Y
                // position so document structure (e.g. the candidate name on the
                // first line) is preserved instead of collapsing to one blob.
                pages.forEach((page: PDFPage) => {
                    const texts = page?.Texts;
                    if (texts && Array.isArray(texts)) {
                        let lastY: number | null = null;
                        texts.forEach((textItem: PDFText) => {
                            const runs = textItem?.R;
                            const fragment = runs && Array.isArray(runs)
                                ? runs.map((run) => (run?.T ? safeDecode(run.T) : "")).join("")
                                : "";
                            if (!fragment) return;

                            const y = typeof textItem.y === "number" ? textItem.y : 0;
                            if (lastY === null) {
                                fullText += fragment;
                            } else if (Math.abs(y - lastY) > LINE_Y_TOLERANCE) {
                                fullText += "\n" + fragment; // new visual line
                            } else {
                                fullText += " " + fragment;  // same line
                            }
                            lastY = y;
                        });
                    }
                    fullText += "\n";
                });

                console.log("PDF Text Extracted, length:", fullText.length);
                resolve(fullText.trim());
            } catch (err) {
                console.error("PDF Text Extraction Error:", err);
                reject(err);
            }
        });

        parser.parseBuffer(buffer);
    });
}
