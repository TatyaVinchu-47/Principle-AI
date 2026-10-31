"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromBuffer } from "@/lib/resume-text";
import { extractResume } from "@/lib/ai/resume";
import { embed } from "@/lib/ai/openai";
import type { RemotePref } from "@/lib/types";

function splitList(value: FormDataEntryValue | null): string[] {
  return String(value || "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type OnboardingResult = { error?: string } | undefined;

/**
 * Parses an uploaded resume: stores the file, extracts text, runs AI/heuristic
 * structured extraction, and returns the structured data for review. Does NOT
 * finalize onboarding — the user confirms on the final step.
 */
export async function parseResumeAction(formData: FormData): Promise<
  | {
      ok: true;
      resumeId: string;
      storagePath: string;
      extraction: Awaited<ReturnType<typeof extractResume>>["data"];
      source: "ai" | "heuristic";
      fileName: string;
    }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a resume file." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: "Resume must be under 8MB." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  const rawText = await extractTextFromBuffer(buffer, file.type, file.name);
  const { data: extraction, source } = await extractResume(rawText);

  // Persist the resume row (mark as primary, unset previous primaries).
  await supabase.from("resumes").update({ is_primary: false }).eq("user_id", user.id);
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      raw_text: rawText || null,
      is_primary: true,
    })
    .select("id")
    .single();

  if (resumeError || !resume) {
    return { ok: false, error: `Could not save resume: ${resumeError?.message}` };
  }

  return {
    ok: true,
    resumeId: resume.id,
    storagePath,
    extraction,
    source,
    fileName: file.name,
  };
}

/**
 * Finalizes onboarding: writes the candidate_profile (merging onboarding fields
 * with the AI-extracted resume structure), computes a profile embedding, and
 * marks the user onboarded.
 */
export async function completeOnboardingAction(payload: {
  name: string;
  college: string;
  graduationYear: number | null;
  targetRoles: string[];
  preferredLocations: string[];
  remotePreference: RemotePref;
  skills: string[];
  experienceYears: number;
  minStipend: number | null;
  preferredCompanies: string[];
  extraction: Record<string, unknown> | null;
}): Promise<OnboardingResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const ex = (payload.extraction ?? {}) as {
    education?: unknown[];
    projects?: unknown[];
    internships?: unknown[];
    work_experience?: unknown[];
    achievements?: unknown[];
    preferred_roles?: string[];
    location?: string;
    seniority?: string;
    summary?: string;
    skills?: string[];
  };

  // Merge skills from onboarding + extraction (dedup, case-insensitive).
  const mergedSkills = dedup([...(payload.skills || []), ...((ex.skills as string[]) || [])]);

  // Build an embedding input from the richest available signal.
  const embeddingInput = [
    payload.name,
    payload.college,
    `Target roles: ${payload.targetRoles.join(", ")}`,
    `Skills: ${mergedSkills.join(", ")}`,
    ex.summary || "",
    `Projects: ${(ex.projects as { name?: string }[] | undefined)?.map((p) => p?.name).filter(Boolean).join(", ") || ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  const embedding = await embed(embeddingInput);

  const profileRow = {
    user_id: user.id,
    college: payload.college || null,
    graduation_year: payload.graduationYear,
    target_roles: payload.targetRoles,
    preferred_locations: payload.preferredLocations,
    remote_preference: payload.remotePreference,
    skills: mergedSkills,
    experience_years: payload.experienceYears,
    min_stipend: payload.minStipend,
    preferred_companies: payload.preferredCompanies,
    education: ex.education ?? [],
    projects: ex.projects ?? [],
    internships: ex.internships ?? [],
    work_experience: ex.work_experience ?? [],
    achievements: ex.achievements ?? [],
    extracted_roles: (ex.preferred_roles as string[]) ?? [],
    extracted_location: ex.location || null,
    seniority: ex.seniority || null,
    resume_summary: ex.summary || null,
    ...(embedding ? { embedding: embedding as unknown as string } : {}),
  };

  const { error: profileError } = await supabase
    .from("candidate_profiles")
    .upsert(profileRow, { onConflict: "user_id" });
  if (profileError) {
    return { error: `Could not save profile: ${profileError.message}` };
  }

  const { error: userError } = await supabase
    .from("users")
    .update({ full_name: payload.name || null, onboarded: true })
    .eq("id", user.id);
  if (userError) {
    return { error: `Could not update account: ${userError.message}` };
  }

  // Analytics event
  await supabase.from("events").insert({
    user_id: user.id,
    type: "onboarding_completed",
    entity: "profile",
    metadata: { skills: mergedSkills.length, target_roles: payload.targetRoles.length },
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

function dedup(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    const key = item.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(item.trim());
    }
  }
  return out;
}
