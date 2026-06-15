// ────────────────────────────────────────────────────────────────
// OCR Provider Abstraction Layer — Type Definitions
// Allows swapping Tesseract.js (dev) ↔ Google Cloud Vision (prod)
// ────────────────────────────────────────────────────────────────

/** A single extracted number from the OCR output */
export interface OcrExtractedEntry {
  /** Raw text label near the number (candidat name, row label, etc.) */
  label: string;
  /** The numeric value extracted */
  value: number;
  /** Confidence for this specific extraction (0–100) */
  confidence: number;
}

/** Full result from an OCR extraction */
export interface OcrResult {
  /** The raw text output from the OCR engine */
  rawText: string;
  /** Structured numbers extracted from the text */
  extractedNumbers: OcrExtractedEntry[];
  /** Overall confidence score (0–100) */
  confidence: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/** Comparison result for a single candidat */
export interface CandidatVerification {
  candidatId: string;
  candidatName: string;
  partyName: string;
  /** The vote count manually entered by the observer */
  manualTotal: number;
  /** The vote count extracted by OCR (null if not found) */
  ocrTotal: number | null;
  /** Whether manual and OCR match */
  match: boolean;
  /** Difference (ocrTotal - manualTotal), null if OCR didn't find a value */
  difference: number | null;
  /** Confidence of the OCR reading for this entry */
  confidence: number;
}

/** Full verification report for a desk */
export interface VerificationReport {
  deskId: string;
  /** Overall status */
  status: "verified" | "mismatch" | "inconclusive" | "error";
  /** Per-candidat breakdown */
  candidats: CandidatVerification[];
  /** How many matched */
  matchCount: number;
  /** How many mismatched */
  mismatchCount: number;
  /** How many could not be verified (OCR didn't find a value) */
  inconclusiveCount: number;
  /** Average OCR confidence */
  averageConfidence: number;
  /** Raw OCR output for debugging */
  rawOcrText: string;
  /** Processing time */
  processingTimeMs: number;
}

/** Interface that all OCR providers must implement */
export interface IOcrProvider {
  /** Extract text and numbers from an image buffer */
  extractFromImage(imageBuffer: Buffer, mimetype?: string): Promise<OcrResult>;

  /** Get the provider name (for logging) */
  readonly name: string;
}
