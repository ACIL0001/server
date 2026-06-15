// ────────────────────────────────────────────────────────────────
// Tesseract.js OCR Provider
// Development provider — runs entirely on the server, no API keys.
// ────────────────────────────────────────────────────────────────

import Tesseract from "tesseract.js";
import type { IOcrProvider, OcrResult, OcrExtractedEntry } from "./ocr.interface";

/**
 * Parse vote-count lines from OCR text.
 *
 * PV forms typically contain rows like:
 *   "Candidat Name ......... 245"
 *   "Ahmed BOUDIAF          123"
 *   "Total                  368"
 *
 * We look for lines ending with a number (possibly preceded by dots/spaces).
 */
function parseVoteCounts(rawText: string): OcrExtractedEntry[] {
  const entries: OcrExtractedEntry[] = [];
  const lines = rawText.split(/\n/).map((l) => l.trim()).filter(Boolean);

  // Pattern: any label text followed by a number at the end of the line
  // Handles: "Candidat Name ... 245", "Candidat Name   245", "245"
  const linePattern = /^(.+?)\s*[.\-–—_\s]{2,}\s*(\d{1,6})\s*$/;
  // Fallback: just a standalone number on a line
  const standaloneNumberPattern = /^(\d{1,6})$/;

  for (const line of lines) {
    const match = line.match(linePattern);
    if (match) {
      const label = match[1].trim();
      const value = parseInt(match[2], 10);
      if (!isNaN(value)) {
        entries.push({ label, value, confidence: 80 });
      }
      continue;
    }

    // Try standalone number
    const numMatch = line.match(standaloneNumberPattern);
    if (numMatch) {
      entries.push({ label: "(unlabeled)", value: parseInt(numMatch[1], 10), confidence: 60 });
    }
  }

  // Also try to find all number sequences in the text as a fallback
  if (entries.length === 0) {
    const allNumbers = rawText.match(/\b\d{1,6}\b/g);
    if (allNumbers) {
      for (const num of allNumbers) {
        const value = parseInt(num, 10);
        if (!isNaN(value) && value > 0) {
          entries.push({ label: "(extracted)", value, confidence: 50 });
        }
      }
    }
  }

  return entries;
}

export class TesseractProvider implements IOcrProvider {
  readonly name = "tesseract.js";

  async extractFromImage(imageBuffer: Buffer, _mimetype?: string): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      const { data } = await Tesseract.recognize(imageBuffer, "fra+ara", {
        // Use default settings; Tesseract.js v6 handles worker management internally
      });

      const rawText = data.text || "";
      const extractedNumbers = parseVoteCounts(rawText);
      const processingTimeMs = Date.now() - startTime;

      return {
        rawText,
        extractedNumbers,
        confidence: data.confidence ?? 0,
        processingTimeMs,
      };
    } catch (err) {
      const processingTimeMs = Date.now() - startTime;
      console.error("[TesseractProvider] OCR error:", err);
      return {
        rawText: "",
        extractedNumbers: [],
        confidence: 0,
        processingTimeMs,
      };
    }
  }
}
