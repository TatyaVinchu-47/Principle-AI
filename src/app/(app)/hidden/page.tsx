import { Sparkles } from "lucide-react";
import { getJobsForUser } from "@/lib/services/jobs";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function HiddenJobsPage() {
  const jobs = await getJobsForUser({ hiddenOnly: true, sort: "fresh", limit: 100 });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="h-6 w-6 text-violet-500" /> Hidden jobs
        </h1>
        <p className="text-sm text-muted-foreground">
          Direct hiring-manager and recruiter posts — not standard job-board
          listings. Each carries a hidden-signal score backed by the post text.
        </p>
      </div>

      {jobs.length ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No hidden jobs right now"
          description="When we detect direct hiring signals, they'll appear here first."
        />
      )}
    </div>
  );
}
