import { CalendarCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("applications")
    .select("job_id, status, updated_at, jobs(role, company_name, location)")
    .eq("user_id", user!.id)
    .in("status", ["interview", "assessment", "offer"])
    .order("updated_at", { ascending: false });

  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CalendarCheck className="h-6 w-6 text-primary" /> Interviews
        </h1>
        <p className="text-sm text-muted-foreground">
          Roles where you&apos;re in assessment, interview, or offer stage.
        </p>
      </div>

      {rows.length ? (
        <div className="grid gap-3">
          {rows.map((r) => {
            const job = r.jobs as unknown as {
              role: string;
              company_name: string;
              location: string | null;
            } | null;
            return (
              <Link
                key={r.job_id as string}
                href={`/jobs/${r.job_id}`}
                className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm"
              >
                <div>
                  <p className="font-medium">{job?.role}</p>
                  <p className="text-sm text-muted-foreground">
                    {job?.company_name}
                    {job?.location ? ` · ${job.location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={r.status === "offer" ? "success" : "warning"}
                    className="capitalize"
                  >
                    {String(r.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(r.updated_at as string)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title="No interviews yet"
          description="Move an application to Assessment, Interview, or Offer to see it here."
        />
      )}
    </div>
  );
}
