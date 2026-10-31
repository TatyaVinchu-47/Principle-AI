import { chatJSON, aiEnabled } from "./openai";
import { JobClassificationSchema, type JobClassification } from "./schemas";
import { detectHiringSignals, scamScore } from "./signals";

const SYSTEM = `You classify text from job sources (career pages, public feeds,
social hiring posts, or user-submitted posts) for an Indian student job platform.

Determine whether the text is actually a hiring opportunity, and extract
structured details. Be conservative: do NOT fabricate companies, salaries, URLs,
or contacts that are not present. Only mark "is_hidden_job": true when the text
is a direct hiring signal from a person (e.g. a manager/recruiter saying "DM your
resume", "my team is hiring") rather than a standard job-board listing.

Return STRICT JSON with EXACTLY these keys:
{
  "is_hiring_opportunity": boolean,
  "company": string|null,
  "role": string|null,
  "location": string|null,
  "work_mode": "onsite"|"remote"|"hybrid"|"unknown",
  "experience_min": number|null,
  "experience_max": number|null,
  "salary_min": number|null,
  "salary_max": number|null,
  "salary_currency": string|null,
  "salary_period": string|null,
  "required_skills": [string],
  "application_method": "url"|"email"|"dm"|"form"|"unknown",
  "application_url": string|null,
  "application_email": string|null,
  "contact_person": string|null,
  "contact_role": string|null,
  "posted_time": string|null,
  "deadline": string|null,
  "is_hiring_manager_post": boolean,
  "is_hidden_job": boolean,
  "hidden_job_score": number (0-100),
  "confidence_score": number (0-100)
}`;

export interface ClassifyResult {
  classification: JobClassification;
  source: "ai" | "heuristic";
  scam: { score: number; flags: string[] };
}

/**
 * Classifies a raw hiring post / job text into a structured JobClassification.
 * AI when available; deterministic heuristics otherwise. Always runs the
 * hidden-signal and scam detectors and reconciles them with the AI output.
 */
export async function classifyJob(
  rawText: string,
  hints?: { sourceUrl?: string | null },
): Promise<ClassifyResult> {
  const text = (rawText || "").trim();
  const signals = detectHiringSignals(text);
  const scam = scamScore(text);

  if (aiEnabled() && text.length > 20) {
    const result = await chatJSON<unknown>({
      system: SYSTEM,
      user: `Source URL: ${hints?.sourceUrl ?? "unknown"}\n\nText:\n"""\n${text.slice(0, 8000)}\n"""`,
      maxTokens: 900,
    });
    if (result) {
      const parsed = JobClassificationSchema.safeParse(result);
      if (parsed.success) {
        const c = reconcile(parsed.data, signals, hints);
        return { classification: c, source: "ai", scam };
      }
    }
  }

  return {
    classification: heuristicClassify(text, signals, hints),
    source: "heuristic",
    scam,
  };
}

/** Blend AI output with deterministic signal detection for consistency. */
function reconcile(
  c: JobClassification,
  signals: ReturnType<typeof detectHiringSignals>,
  hints?: { sourceUrl?: string | null },
): JobClassification {
  // Never let hidden_job be true without an actual hiring signal in text.
  const isHidden = c.is_hidden_job && signals.isHiringSignal;
  // Average the AI and heuristic hidden scores for stability.
  const hidden = isHidden
    ? Math.round((c.hidden_job_score + signals.hiddenJobScore) / 2)
    : Math.min(c.hidden_job_score, 25);
  return {
    ...c,
    application_url: c.application_url ?? hints?.sourceUrl ?? null,
    is_hidden_job: isHidden,
    hidden_job_score: Math.max(0, Math.min(100, hidden)),
    is_hiring_manager_post:
      c.is_hiring_manager_post || signals.looksLikeDirectPost,
  };
}

// ---- Heuristic classifier ---------------------------------------------------

const ROLE_HINTS = [
  "software engineer","frontend engineer","backend engineer","full stack",
  "data analyst","data scientist","product manager","apm","associate product",
  "product management intern","growth","marketing","designer","ui/ux",
  "intern","analyst","developer","engineer",
];

function heuristicClassify(
  text: string,
  signals: ReturnType<typeof detectHiringSignals>,
  hints?: { sourceUrl?: string | null },
): JobClassification {
  const lower = text.toLowerCase();

  const role =
    ROLE_HINTS.find((r) => lower.includes(r))
      ?.replace(/\b\w/g, (m) => m.toUpperCase()) ?? null;

  const workMode: JobClassification["work_mode"] = /remote/i.test(text)
    ? "remote"
    : /hybrid/i.test(text)
      ? "hybrid"
      : /on-?site|in-?office/i.test(text)
        ? "onsite"
        : "unknown";

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const urlMatch = text.match(/https?:\/\/[^\s)]+/);

  const applicationMethod: JobClassification["application_method"] =
    /dm (me )?your (resume|cv)/i.test(text)
      ? "dm"
      : emailMatch
        ? "email"
        : urlMatch || hints?.sourceUrl
          ? "url"
          : "unknown";

  return JobClassificationSchema.parse({
    is_hiring_opportunity: signals.isHiringSignal || !!role,
    company: null,
    role,
    location: null,
    work_mode: workMode,
    required_skills: [],
    application_method: applicationMethod,
    application_url: urlMatch?.[0] ?? hints?.sourceUrl ?? null,
    application_email: emailMatch?.[0] ?? null,
    is_hiring_manager_post: signals.looksLikeDirectPost,
    is_hidden_job: signals.isHiringSignal && signals.hiddenJobScore >= 50,
    hidden_job_score: signals.hiddenJobScore,
    confidence_score: signals.isHiringSignal ? 55 : 30,
  });
}
