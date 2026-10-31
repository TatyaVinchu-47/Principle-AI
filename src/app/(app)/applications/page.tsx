import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { ApplicationsTable, type AppRow } from "./applications-table";
import type { ApplicationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// Statuses that represent an active application the user is tracking.
const TRACKED: ApplicationStatus[] = [
  "applied",
  "referral_requested",
  "referral_received",
  "assessment",
  "interview",
  "rejected",
  "offer",
  "withdrawn",
];

export default async function ApplicationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("applications")
    .select("job_id, status, match_score, updated_at, jobs(role, company_name)")
    .eq("user_id", user!.id)
    .in("status", TRACKED)
    .order("updated_at", { ascending: false });

  const rows: AppRow[] = (data ?? []).map((a) => {
    const job = a.jobs as unknown as { role: string; company_name: string } | null;
    return {
      jobId: a.job_id as string,
      role: job?.role ?? "Role",
      company: job?.company_name ?? "Company",
      status: a.status as ApplicationStatus,
      matchScore: (a.match_score as number | null) ?? null,
      updatedAt: a.updated_at as string,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Send className="h-6 w-6 text-primary" /> Applications
        </h1>
        <p className="text-sm text-muted-foreground">
          Track every application through the pipeline. Update status as you progress.
        </p>
      </div>

      {rows.length ? (
        <ApplicationsTable rows={rows} />
      ) : (
        <EmptyState
          icon={Send}
          title="No applications yet"
          description="When you apply to a job, it appears here so you can track its status."
        />
      )}
    </div>
  );
}
