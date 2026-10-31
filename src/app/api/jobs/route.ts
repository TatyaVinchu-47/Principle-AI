import { NextResponse, type NextRequest } from "next/server";
import { getJobsForUser, type JobFilters } from "@/lib/services/jobs";

/**
 * GET /api/jobs
 * Query params: search, workMode, hiddenOnly, freshOnly, minMatch, sort, limit
 * Returns approved jobs enriched with the current user's match + flags.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const filters: JobFilters = {
    search: sp.get("search") ?? undefined,
    workMode: sp.get("workMode") ?? undefined,
    hiddenOnly: sp.get("hiddenOnly") === "true",
    freshOnly: sp.get("freshOnly") === "true",
    minMatch: sp.get("minMatch") ? Number(sp.get("minMatch")) : undefined,
    sort: (sp.get("sort") as JobFilters["sort"]) ?? "fresh",
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
  };

  const jobs = await getJobsForUser(filters);
  return NextResponse.json({ jobs, count: jobs.length });
}
