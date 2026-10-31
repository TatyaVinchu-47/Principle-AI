import { chatJSON, aiEnabled } from "./openai";
import { MatchSchema } from "./schemas";
import type { CandidateProfile, Job, MatchDetail } from "@/lib/types";

/**
 * Match weights (per spec). Sum = 1.0.
 *  role 30% · skills 25% · experience 15% · location/work-mode 10%
 *  resume/project 10% · preferences 10%
 */
export const WEIGHTS = {
  role: 0.3,
  skills: 0.25,
  experience: 0.15,
  location: 0.1,
  resume: 0.1,
  preferences: 0.1,
} as const;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#.]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(arr: string[]): Set<string> {
  const set = new Set<string>();
  for (const item of arr) {
    const n = norm(item);
    if (n) set.add(n);
    for (const w of n.split(" ")) if (w.length > 1) set.add(w);
  }
  return set;
}

/** Jaccard-like overlap ratio of a (candidate) covering b (required). */
function coverage(required: string[], have: string[]): {
  ratio: number;
  matched: string[];
  missing: string[];
} {
  if (required.length === 0) return { ratio: 1, matched: [], missing: [] };
  const haveTokens = tokenize(have);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const req of required) {
    const reqNorm = norm(req);
    const reqWords = reqNorm.split(" ");
    const hit =
      haveTokens.has(reqNorm) || reqWords.some((w) => w.length > 2 && haveTokens.has(w));
    if (hit) matched.push(req);
    else missing.push(req);
  }
  return { ratio: matched.length / required.length, matched, missing };
}

function roleSimilarity(targetRoles: string[], jobRole: string): number {
  if (targetRoles.length === 0) return 0.5; // neutral if unspecified
  const jr = norm(jobRole);
  const jrWords = new Set(jr.split(" "));
  let best = 0;
  for (const t of targetRoles) {
    const tn = norm(t);
    if (!tn) continue;
    if (tn === jr) best = Math.max(best, 1);
    const tWords = tn.split(" ").filter((w) => w.length > 2);
    const overlap = tWords.filter((w) => jrWords.has(w)).length;
    if (tWords.length) best = Math.max(best, overlap / tWords.length);
  }
  return best;
}

function experienceScore(profile: CandidateProfile, job: Job): number {
  const min = job.experience_min ?? 0;
  const max = job.experience_max ?? min + 2;
  const yrs = profile.experience_years ?? 0;
  if (yrs >= min && yrs <= max) return 1;
  // Candidates slightly under the min (common for students) still score well.
  if (yrs < min) return Math.max(0, 1 - (min - yrs) * 0.3);
  return Math.max(0, 1 - (yrs - max) * 0.2); // overqualified, mild penalty
}

function locationScore(profile: CandidateProfile, job: Job): number {
  const pref = profile.remote_preference;
  const wm = job.work_mode;
  // Work-mode alignment
  let modeScore = 0.5;
  if (pref === "any") modeScore = 1;
  else if (pref === "remote") modeScore = wm === "remote" ? 1 : wm === "hybrid" ? 0.7 : 0.3;
  else if (pref === "onsite") modeScore = wm === "onsite" ? 1 : wm === "hybrid" ? 0.7 : 0.5;
  else if (pref === "hybrid") modeScore = wm === "hybrid" ? 1 : 0.6;

  // City alignment
  const locs = profile.preferred_locations.map(norm);
  const jobLoc = norm(job.location ?? "");
  let cityScore = locs.length === 0 ? 0.7 : 0.4;
  if (jobLoc && locs.some((l) => l && (jobLoc.includes(l) || l.includes(jobLoc))))
    cityScore = 1;
  if (wm === "remote") cityScore = Math.max(cityScore, 0.9);

  return modeScore * 0.5 + cityScore * 0.5;
}

function preferencesScore(profile: CandidateProfile, job: Job): number {
  let score = 0.6; // base
  // Preferred company bump
  const prefCos = profile.preferred_companies.map(norm);
  if (prefCos.length && prefCos.some((c) => norm(job.company_name).includes(c)))
    score += 0.4;
  // Stipend/salary floor
  if (profile.min_stipend && job.salary_min) {
    const monthly =
      job.salary_period === "year" ? Math.round(job.salary_min / 12) : job.salary_min;
    if (monthly >= profile.min_stipend) score = Math.min(1, score + 0.15);
    else score = Math.max(0, score - 0.25);
  }
  return Math.min(1, score);
}

/** Resume/project relevance: do required skills appear in projects/experience? */
function resumeScore(profile: CandidateProfile, job: Job): {
  score: number;
  relevantProjects: string[];
} {
  const corpus = [
    profile.resume_summary ?? "",
    ...profile.projects.map((p) => `${p.name ?? ""} ${p.description ?? ""} ${(p.tech ?? []).join(" ")}`),
    ...profile.internships.map((i) => `${i.role ?? ""} ${i.description ?? ""}`),
    ...profile.work_experience.map((w) => `${w.role ?? ""} ${w.description ?? ""}`),
  ];
  const corpusNorm = corpus.map(norm);
  const req = job.required_skills.map(norm);
  const relevantProjects: string[] = [];

  let hits = 0;
  profile.projects.forEach((p, idx) => {
    const blob = corpusNorm[1 + idx] ?? "";
    if (req.some((r) => r && blob.includes(r.split(" ")[0]))) {
      if (p.name) relevantProjects.push(p.name);
    }
  });
  for (const r of req) {
    if (corpusNorm.some((c) => c.includes(r.split(" ")[0]))) hits++;
  }
  const score = req.length ? Math.min(1, hits / req.length) : 0.5;
  return { score, relevantProjects: relevantProjects.slice(0, 4) };
}

/**
 * Deterministic match computation using the spec weights. This is the baseline
 * that always runs; an AI narrative can enrich `why_candidate_is_a_fit`.
 */
export function computeMatch(profile: CandidateProfile, job: Job): MatchDetail {
  const role = roleSimilarity(
    [...profile.target_roles, ...profile.extracted_roles],
    job.role,
  );
  const skillCov = coverage(job.required_skills, profile.skills);
  const exp = experienceScore(profile, job);
  const loc = locationScore(profile, job);
  const resume = resumeScore(profile, job);
  const prefs = preferencesScore(profile, job);

  const breakdown = {
    role: Math.round(role * 100),
    skills: Math.round(skillCov.ratio * 100),
    experience: Math.round(exp * 100),
    location: Math.round(loc * 100),
    resume: Math.round(resume.score * 100),
    preferences: Math.round(prefs * 100),
  };

  const weighted =
    role * WEIGHTS.role +
    skillCov.ratio * WEIGHTS.skills +
    exp * WEIGHTS.experience +
    loc * WEIGHTS.location +
    resume.score * WEIGHTS.resume +
    prefs * WEIGHTS.preferences;

  const match_score = Math.round(weighted * 100);

  const concerns: string[] = [];
  if (skillCov.missing.length)
    concerns.push(`Missing some required skills: ${skillCov.missing.slice(0, 4).join(", ")}.`);
  if (exp < 0.6) concerns.push("Experience level may be below the role's expectation.");
  if (breakdown.location < 50) concerns.push("Location/work-mode may not align.");

  const why =
    `Strong on ${
      [
        breakdown.role >= 70 ? "role fit" : null,
        breakdown.skills >= 60 ? "skills overlap" : null,
        breakdown.location >= 70 ? "location/work-mode" : null,
      ]
        .filter(Boolean)
        .join(", ") || "overall profile alignment"
    }. Matches ${skillCov.matched.length}/${job.required_skills.length} required skills.`;

  return {
    match_score,
    matching_skills: skillCov.matched,
    missing_skills: skillCov.missing,
    relevant_projects: resume.relevantProjects,
    why_candidate_is_a_fit: why,
    potential_concerns: concerns,
    breakdown,
  };
}

/**
 * Optionally enrich the deterministic match with an AI-written explanation.
 * Keeps the numeric score deterministic (for trust/consistency) but produces a
 * more natural "why" and concerns when AI is available.
 */
export async function explainMatch(
  profile: CandidateProfile,
  job: Job,
  base: MatchDetail,
): Promise<MatchDetail> {
  if (!aiEnabled()) return base;

  const result = await chatJSON<unknown>({
    system: `You explain a precomputed job match to a student candidate. Do NOT
change the numeric score. Never fabricate the candidate's experience. Return
STRICT JSON: {"match_score","matching_skills","missing_skills",
"relevant_projects","why_candidate_is_a_fit","potential_concerns"}.`,
    user: JSON.stringify({
      precomputed_score: base.match_score,
      candidate: {
        target_roles: profile.target_roles,
        skills: profile.skills,
        experience_years: profile.experience_years,
        projects: profile.projects.map((p) => p.name).filter(Boolean),
        summary: profile.resume_summary,
      },
      job: {
        role: job.role,
        company: job.company_name,
        required_skills: job.required_skills,
        location: job.location,
        work_mode: job.work_mode,
      },
      precomputed_matching_skills: base.matching_skills,
      precomputed_missing_skills: base.missing_skills,
    }),
    maxTokens: 500,
  });

  if (result) {
    const parsed = MatchSchema.safeParse(result);
    if (parsed.success) {
      return {
        ...base,
        match_score: base.match_score, // keep deterministic score
        why_candidate_is_a_fit: parsed.data.why_candidate_is_a_fit || base.why_candidate_is_a_fit,
        potential_concerns:
          parsed.data.potential_concerns.length
            ? parsed.data.potential_concerns
            : base.potential_concerns,
        relevant_projects:
          parsed.data.relevant_projects.length
            ? parsed.data.relevant_projects
            : base.relevant_projects,
      };
    }
  }
  return base;
}
