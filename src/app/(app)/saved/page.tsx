import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJobsForUser } from "@/lib/services/jobs";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: savedRows } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", user!.id);
  const savedIds = new Set((savedRows ?? []).map((r: { job_id: string }) => r.job_id));

  const all = await getJobsForUser({ limit: 200 });
  const jobs = all.filter((j) => savedIds.has(j.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Bookmark className="h-6 w-6 text-primary" /> Saved jobs
      </h1>
      {jobs.length ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Tap Save on any job to keep it here for later."
        />
      )}
    </div>
  );
}
