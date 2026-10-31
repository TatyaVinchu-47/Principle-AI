import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  jobsDiscovered: number;
  jobsMatching: number; // approved jobs with match >= 60 is computed client-side; here we expose total approved
  applicationsSent: number;
  referralRequests: number;
  referralsReceived: number;
  interviews: number;
  offers: number;
  saved: number;
}

/**
 * Aggregates KPIs for the signed-in user's dashboard. Uses count queries to
 * stay cheap. `jobsMatching` is the number of approved jobs (the matched subset
 * is derived in the UI where match scores are available).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: DashboardStats = {
    jobsDiscovered: 0,
    jobsMatching: 0,
    applicationsSent: 0,
    referralRequests: 0,
    referralsReceived: 0,
    interviews: 0,
    offers: 0,
    saved: 0,
  };
  if (!user) return empty;

  const count = (q: { count: number | null }) => q.count ?? 0;

  const [
    jobsTotal,
    applied,
    refReq,
    refRecv,
    interviews,
    offers,
    saved,
  ] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["applied", "assessment", "interview", "offer", "rejected"]),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "referral_requested"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "referral_received"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "interview"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "offer"),
    supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  return {
    jobsDiscovered: count(jobsTotal),
    jobsMatching: count(jobsTotal),
    applicationsSent: count(applied),
    referralRequests: count(refReq),
    referralsReceived: count(refRecv),
    interviews: count(interviews),
    offers: count(offers),
    saved: count(saved),
  };
}
