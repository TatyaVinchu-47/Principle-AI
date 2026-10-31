import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES RLS — SERVER ONLY.
 * Use for catalog writes (jobs, companies, hiring_posts, referral_opportunities),
 * ingestion, and admin approve/reject. Never import this into client code.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for server-side catalog writes.",
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
