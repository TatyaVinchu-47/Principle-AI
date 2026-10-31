/**
 * Hidden-job / hiring-signal detection.
 *
 * Product rule: we do NOT claim a job is "hidden" unless there is evidence of a
 * hiring signal that isn't a normal job-board listing (e.g. a manager/recruiter
 * personally posting "DM your resume"). This module provides a deterministic,
 * explainable baseline that the AI classifier can refine.
 */

export const HIRING_SIGNAL_PHRASES = [
  "we're hiring",
  "we are hiring",
  "hiring",
  "looking for",
  "dm your resume",
  "dm me your resume",
  "send your cv",
  "send me your cv",
  "join our team",
  "open position",
  "open role",
  "internship",
  "referrals",
  "refer",
  "reach out",
  "applications open",
  "now hiring",
];

/** Phrases that strongly indicate a direct manager/recruiter post (not a board). */
const DIRECT_POST_PHRASES = [
  "dm your resume",
  "dm me your resume",
  "send your cv",
  "send me your cv",
  "reach out",
  "my team",
  "join my team",
  "i'm hiring",
  "i am hiring",
  "we're hiring",
];

/** Phrases typical of a normal structured job-board listing (lowers hidden score). */
const BOARD_LISTING_PHRASES = [
  "apply now",
  "job id",
  "requisition",
  "equal opportunity employer",
  "job description",
  "responsibilities:",
  "qualifications:",
];

export interface SignalResult {
  isHiringSignal: boolean;
  hiddenJobScore: number; // 0..100
  matchedPhrases: string[];
  looksLikeDirectPost: boolean;
}

export function detectHiringSignals(text: string): SignalResult {
  const lower = (text || "").toLowerCase();

  const matchedPhrases = HIRING_SIGNAL_PHRASES.filter((p) => lower.includes(p));
  const directHits = DIRECT_POST_PHRASES.filter((p) => lower.includes(p));
  const boardHits = BOARD_LISTING_PHRASES.filter((p) => lower.includes(p));

  const isHiringSignal = matchedPhrases.length > 0;

  // Score: base on number of signal phrases, boosted by direct-post language,
  // dampened by board-listing structure. Clamped 0..100.
  let score = 0;
  if (isHiringSignal) {
    score = 25 + Math.min(matchedPhrases.length, 4) * 10; // 35..65
    score += Math.min(directHits.length, 3) * 12; // +0..36 → direct posts
    score -= Math.min(boardHits.length, 3) * 15; // board structure lowers it
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    isHiringSignal,
    hiddenJobScore: score,
    matchedPhrases,
    looksLikeDirectPost: directHits.length > 0,
  };
}

/**
 * Lightweight scam heuristics (trust & safety). Higher = more suspicious.
 * We never *assert* legitimacy; this only flags risk for review.
 */
const SCAM_PHRASES = [
  "registration fee",
  "pay to apply",
  "security deposit",
  "pay a fee",
  "processing fee",
  "whatsapp only",
  "telegram only",
  "earn from home guaranteed",
  "no experience huge salary",
  "send money",
  "upi id",
  "gift card",
];

export function scamScore(text: string): { score: number; flags: string[] } {
  const lower = (text || "").toLowerCase();
  const flags = SCAM_PHRASES.filter((p) => lower.includes(p));
  const score = Math.min(100, flags.length * 35);
  return { score, flags };
}
