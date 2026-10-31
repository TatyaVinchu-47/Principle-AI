import { Sparkles, Compass } from "lucide-react";
import { getJobsForUser } from "@/lib/services/jobs";
import { getDashboardStats } from "@/lib/services/stats";
import { KpiStrip } from "@/components/kpi-strip";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, allJobs] = await Promise.all([
    getDashboardStats(),
    getJobsForUser({ sort: "match", limit: 100 }),
  ]);

  // Recommended = sorted by match. Latest hidden = hidden jobs by freshness.
  const recommended = [...allJobs]
    .sort((a, b) => (b.match?.match_score ?? 0) - (a.match?.match_score ?? 0))
    .slice(0, 8);

  const hidden = [...allJobs]
    .filter((j) => j.is_hidden_job)
    .sort((a, b) => {
      const ta = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const tb = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Fresh opportunities, ranked by how well they match you.
        </p>
      </div>

      <KpiStrip stats={stats} />

      {/* Recommended */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Compass className="h-5 w-5 text-primary" /> Recommended for you
          </h2>
          <Badge variant="muted">{recommended.length}</Badge>
        </div>
        {recommended.length ? (
          <div className="grid gap-4">
            {recommended.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Compass}
            title="No jobs yet"
            description="Once jobs are ingested and your profile is set, matched roles show up here."
          />
        )}
      </section>

      {/* Latest hidden */}
      {hidden.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-violet-500" /> Latest hidden jobs
            </h2>
            <Badge variant="referral">{hidden.length}</Badge>
          </div>
          <div className="grid gap-4">
            {hidden.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
