import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyJob } from "@/lib/ai/classify";
import { embed } from "@/lib/ai/openai";
import type { JobClassification } from "@/lib/ai/schemas";

/**
 * Modular Job Ingestion.
 *
 * Every incoming raw item (from any adapter — career page, public feed, X
 * signal, user submission, approved API provider) flows through:
 *   1. AI Job Classifier (classifyJob)      → structured JobClassification + scam
 *   2. Duplicate detection (dedupe hash)     → skip if seen
 *   3. Trust gating                          → status pending/approved/rejected
 *   4. Persist hiring_post + job (+embedding)
 *
 * Writes use the service-role client (bypasses RLS) and run server-side only.
 */

export type IngestSource =
  | "career_page"
  | "public_feed"
  | "x_signal"
  | "user_submitted"
  | "api_provider";

export interface IngestInput {
  rawText: string;
  sourceUrl?: string | null;
  sourceKind: IngestSource;
  submittedBy?: string | null; // user id for user_submitted
}

export interface IngestResult {
  status: "created" | "duplicate" | "rejected";
  reason?: string;
  jobId?: string;
  hiringPostId?: string;
  classification: JobClassification;
  hiddenJobScore: number;
  scamScore: number;
}

function dedupeHash(parts: (string | null | undefined)[]): string {
  const normalized = parts
    .map((p) => (p ?? "").toLowerCase().replace(/\s+/g, " ").trim())
    .join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export async function ingestItem(input: IngestInput): Promise<IngestResult> {
  const admin = createAdminClient();

  // 1) Classify
  const { classification, scam } = await classifyJob(input.rawText, {
    sourceUrl: input.sourceUrl,
  });

  // Map source kind → source row (best-effort)
  const { data: source } = await admin
    .from("job_sources")
    .select("id")
    .eq("kind", input.sourceKind)
    .limit(1)
    .maybeSingle();

  // 2) Persist the raw hiring post record (audit trail / admin review)
  const postHash = dedupeHash([input.sourceUrl, input.rawText.slice(0, 500)]);
  const { data: post } = await admin
    .from("hiring_posts")
    .insert({
      source_id: source?.id ?? null,
      submitted_by: input.submittedBy ?? null,
      source_url: input.sourceUrl ?? null,
      raw_text: input.rawText,
      classified: true,
      classification,
      is_hiring_signal: classification.is_hiring_opportunity,
      hidden_job_score: classification.hidden_job_score,
      dedupe_hash: postHash,
    })
    .select("id")
    .single();

  const hiringPostId = post?.id as string | undefined;

  // Reject non-opportunities and high scam risk (still kept for admin review).
  if (!classification.is_hiring_opportunity) {
    return {
      status: "rejected",
      reason: "Not classified as a hiring opportunity.",
      hiringPostId,
      classification,
      hiddenJobScore: classification.hidden_job_score,
      scamScore: scam.score,
    };
  }

  // 3) Duplicate detection against existing jobs
  const jobHash = dedupeHash([
    classification.company,
    classification.role,
    classification.location,
  ]);
  const { data: dupe } = await admin
    .from("jobs")
    .select("id")
    .eq("dedupe_hash", jobHash)
    .maybeSingle();
  if (dupe) {
    return {
      status: "duplicate",
      reason: "A matching job already exists.",
      jobId: dupe.id,
      hiringPostId,
      classification,
      hiddenJobScore: classification.hidden_job_score,
      scamScore: scam.score,
    };
  }

  // 4) Upsert company (if named)
  let companyId: string | null = null;
  if (classification.company) {
    companyId = await upsertCompany(admin, classification.company);
  }

  // 5) Embedding for semantic matching (optional)
  const embedding = await embed(
    `${classification.role ?? ""} at ${classification.company ?? ""}. Skills: ${classification.required_skills.join(", ")}. ${input.rawText.slice(0, 500)}`,
  );

  // Trust gating: user-submitted and low-confidence items go to 'pending' for
  // admin approval; high-scam items rejected. Trusted sources auto-approve.
  const needsReview =
    input.sourceKind === "user_submitted" ||
    classification.confidence_score < 50 ||
    scam.score >= 35;
  const status = scam.score >= 70 ? "rejected" : needsReview ? "pending" : "approved";

  const { data: job } = await admin
    .from("jobs")
    .insert({
      company_id: companyId,
      source_id: source?.id ?? null,
      hiring_post_id: hiringPostId ?? null,
      company_name: classification.company ?? "Unknown company",
      role: classification.role ?? "Unspecified role",
      description: input.rawText.slice(0, 4000),
      location: classification.location,
      work_mode: classification.work_mode,
      experience_min: classification.experience_min,
      experience_max: classification.experience_max,
      salary_min: classification.salary_min,
      salary_max: classification.salary_max,
      salary_currency: classification.salary_currency ?? "INR",
      salary_period: classification.salary_period ?? "month",
      required_skills: classification.required_skills,
      application_method: classification.application_method,
      application_url: classification.application_url,
      application_email: classification.application_email,
      contact_person: classification.contact_person,
      contact_role: classification.contact_role,
      is_hiring_manager_post: classification.is_hiring_manager_post,
      is_hidden_job: classification.is_hidden_job,
      hidden_job_score: classification.hidden_job_score,
      scam_score: scam.score,
      confidence_score: classification.confidence_score,
      status,
      posted_at: new Date().toISOString(),
      dedupe_hash: jobHash,
      ...(embedding ? { embedding: embedding as unknown as string } : {}),
    })
    .select("id")
    .single();

  return {
    status: status === "rejected" ? "rejected" : "created",
    reason: status === "pending" ? "Pending admin verification." : undefined,
    jobId: job?.id as string | undefined,
    hiringPostId,
    classification,
    hiddenJobScore: classification.hidden_job_score,
    scamScore: scam.score,
  };
}

async function upsertCompany(
  admin: ReturnType<typeof createAdminClient>,
  name: string,
): Promise<string> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const { data: existing } = await admin
    .from("companies")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created } = await admin
    .from("companies")
    .insert({ name, slug })
    .select("id")
    .single();
  return created!.id;
}
