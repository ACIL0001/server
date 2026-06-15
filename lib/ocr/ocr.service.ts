// ────────────────────────────────────────────────────────────────
// OCR Service — Main entry point for OCR operations.
// Picks the provider based on environment configuration.
// ────────────────────────────────────────────────────────────────

import type { IOcrProvider, OcrResult } from "./ocr.interface";
import { TesseractProvider } from "./tesseract.provider";

let provider: IOcrProvider | null = null;

function getProvider(): IOcrProvider {
  if (provider) return provider;

  const ocrEngine = process.env.OCR_ENGINE || "tesseract";

  switch (ocrEngine) {
    case "google_vision":
      // TODO: Implement GoogleVisionProvider for production
      // import { GoogleVisionProvider } from "./google-vision.provider";
      // provider = new GoogleVisionProvider();
      console.warn("[OCR] Google Vision provider not yet implemented, falling back to Tesseract");
      provider = new TesseractProvider();
      break;

    case "tesseract":
    default:
      provider = new TesseractProvider();
      break;
  }

  console.log(`[OCR] Using provider: ${provider.name}`);
  return provider;
}

/**
 * Extract vote counts from a PV image.
 */
export async function extractVotesFromImage(
  imageBuffer: Buffer,
  mimetype?: string
): Promise<OcrResult> {
  const p = getProvider();
  return p.extractFromImage(imageBuffer, mimetype);
}

export { type OcrResult, type IOcrProvider };
