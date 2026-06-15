// ────────────────────────────────────────────────────────────────
// Comparison Service — Compares OCR-extracted numbers against
// manually-entered ResultDesk totals for a given desk.
// ────────────────────────────────────────────────────────────────

import type { OcrResult, CandidatVerification, VerificationReport } from "./ocr.interface";

interface ManualEntry {
  candidatId: string;
  candidatName: string;
  partyName: string;
  manualTotal: number;
}

/**
 * Try to match OCR-extracted numbers to manual entries.
 *
 * Strategy (ranked by reliability):
 * 1. Label-based matching: if the OCR extracted a label near the number,
 *    try to fuzzy-match it to a candidat name.
 * 2. Order-based matching: if the PV form has a standardized layout,
 *    the i-th extracted number corresponds to the i-th candidat.
 * 3. Value-based matching: look for exact value matches.
 */
export function compareResults(
  ocrResult: OcrResult,
  manualEntries: ManualEntry[]
): VerificationReport {
  const startTime = Date.now();
  const candidats: CandidatVerification[] = [];

  // First, try label-based matching
  const unmatchedOcr = [...ocrResult.extractedNumbers];
  const unmatchedManual = [...manualEntries];

  // Pass 1: Fuzzy label matching
  for (let i = unmatchedManual.length - 1; i >= 0; i--) {
    const manual = unmatchedManual[i];
    const normalizedName = normalizeText(manual.candidatName);

    const ocrIndex = unmatchedOcr.findIndex(
      (entry) => normalizeText(entry.label).includes(normalizedName) ||
                 normalizedName.includes(normalizeText(entry.label))
    );

    if (ocrIndex !== -1) {
      const ocrEntry = unmatchedOcr[ocrIndex];
      candidats.push({
        candidatId: manual.candidatId,
        candidatName: manual.candidatName,
        partyName: manual.partyName,
        manualTotal: manual.manualTotal,
        ocrTotal: ocrEntry.value,
        match: manual.manualTotal === ocrEntry.value,
        difference: ocrEntry.value - manual.manualTotal,
        confidence: ocrEntry.confidence,
      });
      unmatchedOcr.splice(ocrIndex, 1);
      unmatchedManual.splice(i, 1);
    }
  }

  // Pass 2: Order-based matching (for standardized PV forms)
  // If we still have unmatched entries on both sides, match by position
  if (unmatchedManual.length > 0 && unmatchedOcr.length > 0) {
    const minLen = Math.min(unmatchedManual.length, unmatchedOcr.length);
    for (let i = 0; i < minLen; i++) {
      const manual = unmatchedManual[i];
      const ocrEntry = unmatchedOcr[i];
      candidats.push({
        candidatId: manual.candidatId,
        candidatName: manual.candidatName,
        partyName: manual.partyName,
        manualTotal: manual.manualTotal,
        ocrTotal: ocrEntry.value,
        match: manual.manualTotal === ocrEntry.value,
        difference: ocrEntry.value - manual.manualTotal,
        confidence: ocrEntry.confidence,
      });
    }

    // Mark remaining unmatched manual entries as inconclusive
    for (let i = minLen; i < unmatchedManual.length; i++) {
      const manual = unmatchedManual[i];
      candidats.push({
        candidatId: manual.candidatId,
        candidatName: manual.candidatName,
        partyName: manual.partyName,
        manualTotal: manual.manualTotal,
        ocrTotal: null,
        match: false,
        difference: null,
        confidence: 0,
      });
    }
  } else if (unmatchedManual.length > 0) {
    // No OCR numbers left to match
    for (const manual of unmatchedManual) {
      candidats.push({
        candidatId: manual.candidatId,
        candidatName: manual.candidatName,
        partyName: manual.partyName,
        manualTotal: manual.manualTotal,
        ocrTotal: null,
        match: false,
        difference: null,
        confidence: 0,
      });
    }
  }

  // Calculate summary stats
  const matchCount = candidats.filter((c) => c.match).length;
  const mismatchCount = candidats.filter((c) => !c.match && c.ocrTotal !== null).length;
  const inconclusiveCount = candidats.filter((c) => c.ocrTotal === null).length;

  const confidences = candidats.filter((c) => c.confidence > 0).map((c) => c.confidence);
  const averageConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  // Determine overall status
  let status: VerificationReport["status"];
  if (candidats.length === 0 || inconclusiveCount === candidats.length) {
    status = "inconclusive";
  } else if (mismatchCount > 0) {
    status = "mismatch";
  } else if (matchCount > 0 && inconclusiveCount === 0) {
    status = "verified";
  } else {
    status = "inconclusive";
  }

  return {
    deskId: "",  // Will be set by the caller
    status,
    candidats,
    matchCount,
    mismatchCount,
    inconclusiveCount,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    rawOcrText: ocrResult.rawText,
    processingTimeMs: Date.now() - startTime + ocrResult.processingTimeMs,
  };
}

/** Normalize text for fuzzy matching (lowercase, remove diacritics, trim) */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Remove diacritics
    .replace(/[^a-z0-9\s\u0600-\u06FF]/g, "")  // Keep alphanumeric + Arabic
    .trim();
}
