import { chatJSON, aiEnabled } from "./openai";
import { ResumeExtractionSchema, type ResumeExtraction } from "./schemas";

const SYSTEM = `You are a precise resume parser for an Indian student job platform.
Extract ONLY information explicitly present in the resume. Never invent, infer
achievements, or embellish. If a field is absent, use an empty value.
Return STRICT JSON matching this shape:
{
  "education": [{"institution","degree","field","start_year","end_year","grade"}],
  "skills": [string],
  "projects": [{"name","description","tech":[string],"link"}],
  "internships": [{"company","role","start","end","description"}],
  "work_experience": [{"company","role","start","end","description"}],
  "achievements": [string],
  "preferred_roles": [string],
  "location": string,
  "seniority": "intern"|"entry"|"junior"|"mid"|"senior"|"unknown",
  "summary": string (<= 2 sentences, factual)
}`;

/**
 * Extracts a structured profile from raw resume text. Uses OpenAI when
 * available; otherwise falls back to a deterministic heuristic parser so the
 * onboarding flow still produces a usable profile.
 */
export async function extractResume(rawText: string): Promise<{
  data: ResumeExtraction;
  source: "ai" | "heuristic";
}> {
  const text = (rawText || "").trim();

  if (aiEnabled() && text.length > 40) {
    const result = await chatJSON<unknown>({
      system: SYSTEM,
      user: `Resume text:\n"""\n${text.slice(0, 12000)}\n"""`,
      maxTokens: 1500,
    });
    if (result) {
      const parsed = ResumeExtractionSchema.safeParse(result);
      if (parsed.success) return { data: parsed.data, source: "ai" };
    }
  }

  return { data: heuristicExtract(text), source: "heuristic" };
}

// ---- Heuristic fallback -----------------------------------------------------

const COMMON_SKILLS = [
  "javascript","typescript","python","java","kotlin","go","golang","c++","c#",
  "react","next.js","nextjs","node.js","nodejs","express","django","flask",
  "sql","postgresql","mysql","mongodb","redis","graphql","rest",
  "html","css","tailwind","figma","wireframing",
  "aws","gcp","azure","docker","kubernetes","git",
  "excel","power bi","tableau","statistics","data visualization",
  "machine learning","nlp","pytorch","tensorflow","pandas","numpy",
  "product sense","analytics","communication","stakeholder management",
  "marketing","google ads","seo","content","system design","microservices",
];

function heuristicExtract(text: string): ResumeExtraction {
  const lower = text.toLowerCase();

  const skills = Array.from(
    new Set(COMMON_SKILLS.filter((s) => lower.includes(s))),
  ).map(titleize);

  // naive section grabs
  const location = guessLocation(text);
  const seniority = /intern/i.test(text)
    ? "intern"
    : /fresher|final year|graduat/i.test(text)
      ? "entry"
      : "unknown";

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const summary =
    text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 40 && l.length < 300)[0] ?? "";

  return ResumeExtractionSchema.parse({
    education: [],
    skills,
    projects: [],
    internships: [],
    work_experience: [],
    achievements: [],
    preferred_roles: [],
    location,
    seniority,
    summary: summary.slice(0, 280),
    // emailMatch kept out of structured output; email is captured at auth.
    ...(emailMatch ? {} : {}),
  });
}

const INDIAN_CITIES = [
  "Bangalore","Bengaluru","Mumbai","Delhi","Gurugram","Gurgaon","Hyderabad",
  "Pune","Chennai","Kolkata","Noida","Ahmedabad","Jaipur","Jodhpur","Indore",
];

function guessLocation(text: string): string {
  for (const city of INDIAN_CITIES) {
    if (new RegExp(`\\b${city}\\b`, "i").test(text)) return city;
  }
  return "";
}

function titleize(s: string): string {
  return s
    .split(" ")
    .map((w) => (w.length <= 3 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
