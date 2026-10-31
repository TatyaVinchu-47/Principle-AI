import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeMatch } from "@/lib/ai/match";
import type {
  CandidateProfile,
  Job,
  JobWithMatch,
  MatchDetail,
} from "@/lib/types";

export interface JobFilters {
  search?: string;
  workMode?: string; // 'remote' | 'hybrid' | 'onsite'
  hiddenOnly?: boolean;
  freshOnly?: boolean; // posted within 48h
  minMatch?: number;
  sort?: "match" | "fresh";
  limit?: number;
}

/** Loads the current user's candidate profile (or null). */
export async function getProfile(): Promise<CandidateProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return (data as CandidateProfile) ?? null;
}

/**
 * Fetches approved jobs, attaches per-user match scores, saved/applied flags,
 * and referral availability, then applies filters and sorting.
 */
export async function getJobsForUser(filters: JobFilters = {}): Promise<JobWithMatch[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("jobs")
    .select("*")
    .eq("status", "approved")
    .order("posted_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.hiddenOnly) query = query.eq("is_hidden_job", true);
  if (filters.workMode) query = query.eq("work_mode", filters.workMode);

  const { data: jobsData, error } = await query;
  if (error || !jobsData) return [];
  let jobs = jobsData as Job[];

  // Text search (client-side over the fetched window for simplicity)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.role.toLowerCase().includes(q) ||
        j.company_name.toLowerCase().includes(q) ||
        (j.location ?? "").toLowerCase().includes(q) ||
        j.required_skills.some((s) => s.toLowerCase().includes(q)),
    );
  }

  if (filters.freshOnly) {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    jobs = jobs.filter((j) => j.posted_at && new Date(j.posted_at).getTime() >= cutoff);
  }

  // Per-user augmentation
  let profile: CandidateProfile | null = null;
  const savedSet = new Set<string>();
  const appStatus = new Map<string, string>();

  if (user) {
    const [{ data: prof }, { data: saved }, { data: apps }] = await Promise.all([
      supabase.from("candidate_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("saved_jobs").select("job_id").eq("user_id", user.id),
      supabase.from("applications").select("job_id, status").eq("user_id", user.id),
    ]);
    profile = (prof as CandidateProfile) ?? null;
    (saved ?? []).forEach((s: { job_id: string }) => savedSet.add(s.job_id));
    (apps ?? []).forEach((a: { job_id: string; status: string }) =>
      appStatus.set(a.job_id, a.status),
    );
  }

  // Referral availability by company name (evidence-backed).
  const companyNames = Array.from(new Set(jobs.map((j) => j.company_name.toLowerCase())));
  const referralCompanies = new Set<string>();
  if (companyNames.length) {
    const { data: refs } = await supabase
      .from("referral_opportunities")
      .select("company_name");
    (refs ?? []).forEach((r: { company_name: string }) =>
      referralCompanies.add(r.company_name.toLowerCase()),
    );
  }

  const enriched: JobWithMatch[] = jobs.map((job) => {
    const match: MatchDetail | null = profile ? computeMatch(profile, job) : null;
    return {
      ...job,
      match,
      saved: savedSet.has(job.id),
      application_status: (appStatus.get(job.id) as JobWithMatch["application_status"]) ?? null,
      referral_available: referralCompanies.has(job.company_name.toLowerCase()),
    };
  });

  // Min match filter
  let result = enriched;
  if (filters.minMatch && profile) {
    result = result.filter((j) => (j.match?.match_score ?? 0) >= filters.minMatch!);
  }

  // Sorting
  if (filters.sort === "match" && profile) {
    result.sort((a, b) => (b.match?.match_score ?? 0) - (a.match?.match_score ?? 0));
  } else {
    result.sort((a, b) => {
      const ta = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const tb = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      return tb - ta;
    });
  }

  return result;
}

/** Single job with match + flags for a detail view. */
export async function getJobForUser(jobId: string): Promise<JobWithMatch | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("status", "approved")
    .single();
  if (!job) return null;

  let match: MatchDetail | null = null;
  let saved = false;
  let application_status: JobWithMatch["application_status"] = null;
  let referral_available = false;

  if (user) {
    const [{ data: prof }, { data: savedRow }, { data: app }, { data: refs }] =
      await Promise.all([
        supabase.from("candidate_profiles").select("*").eq("user_id", user.id).single(),
        supabase
          .from("saved_jobs")
          .select("id")
          .eq("user_id", user.id)
          .eq("job_id", jobId)
          .maybeSingle(),
        supabase
          .from("applications")
          .select("status")
          .eq("user_id", user.id)
          .eq("job_id", jobId)
          .maybeSingle(),
        supabase
          .from("referral_opportunities")
          .select("id")
          .ilike("company_name", (job as Job).company_name)
          .limit(1),
      ]);
    if (prof) match = computeMatch(prof as CandidateProfile, job as Job);
    saved = !!savedRow;
    application_status = (app?.status as JobWithMatch["application_status"]) ?? null;
    referral_available = !!(refs && refs.length);
  }

  return { ...(job as Job), match, saved, application_status, referral_available };
}
