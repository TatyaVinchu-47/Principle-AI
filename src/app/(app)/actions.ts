"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeMatch } from "@/lib/ai/match";
import type { ApplicationStatus, CandidateProfile, Job } from "@/lib/types";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/** Toggle save state for a job. Returns the new saved state. */
export async function toggleSaveJob(jobId: string): Promise<{ saved: boolean }> {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_jobs").delete().eq("id", existing.id);
    await logEvent(user.id, "job_unsaved", "job", jobId);
    revalidatePath("/dashboard");
    revalidatePath("/saved");
    return { saved: false };
  }

  await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: jobId });
  await logEvent(user.id, "job_saved", "job", jobId);
  revalidatePath("/dashboard");
  revalidatePath("/saved");
  return { saved: true };
}

/**
 * Records that a user is applying to a job (Phase 1 = external/manual apply).
 * Creates or upgrades the application row and snapshots the match detail.
 * Gmail-based sending is Phase 4.
 */
export async function markApplied(
  jobId: string,
  via: "external" | "manual" = "external",
): Promise<{ ok: true }> {
  const { supabase, user } = await requireUser();

  const [{ data: job }, { data: profile }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).single(),
    supabase.from("candidate_profiles").select("*").eq("user_id", user.id).single(),
  ]);

  const match =
    job && profile ? computeMatch(profile as CandidateProfile, job as Job) : null;

  await supabase.from("applications").upsert(
    {
      user_id: user.id,
      job_id: jobId,
      status: "applied" as ApplicationStatus,
      applied_via: via,
      applied_at: new Date().toISOString(),
      match_score: match?.match_score ?? null,
      match_detail: match,
    },
    { onConflict: "user_id,job_id" },
  );

  await logEvent(user.id, "applied", "job", jobId, { via });
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  return { ok: true };
}

/** Update an application's pipeline status. */
export async function updateApplicationStatus(
  jobId: string,
  status: ApplicationStatus,
): Promise<{ ok: true }> {
  const { supabase, user } = await requireUser();

  await supabase.from("applications").upsert(
    { user_id: user.id, job_id: jobId, status },
    { onConflict: "user_id,job_id" },
  );
  await logEvent(user.id, "application_status_changed", "application", jobId, { status });
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Record that a job card was viewed (freshness/analytics). */
export async function markViewed(jobId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!existing) {
    await supabase
      .from("applications")
      .insert({ user_id: user.id, job_id: jobId, status: "viewed" });
  }
  await logEvent(user.id, "job_viewed", "job", jobId);
}

async function logEvent(
  userId: string,
  type: string,
  entity: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createClient();
  await supabase
    .from("events")
    .insert({ user_id: userId, type, entity, entity_id: entityId, metadata });
}

/** Update onboarding/preference fields on the candidate profile. */
export async function updatePreferences(payload: {
  college: string;
  graduationYear: number | null;
  targetRoles: string[];
  preferredLocations: string[];
  remotePreference: "onsite" | "remote" | "hybrid" | "any";
  skills: string[];
  experienceYears: number;
  minStipend: number | null;
  preferredCompanies: string[];
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("candidate_profiles")
    .update({
      college: payload.college || null,
      graduation_year: payload.graduationYear,
      target_roles: payload.targetRoles,
      preferred_locations: payload.preferredLocations,
      remote_preference: payload.remotePreference,
      skills: payload.skills,
      experience_years: payload.experienceYears,
      min_stipend: payload.minStipend,
      preferred_companies: payload.preferredCompanies,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logEvent(user.id, "preferences_updated", "profile", user.id);
  revalidatePath("/preferences");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
