import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Building2,
  UserCheck,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { getJobForUser } from "@/lib/services/jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchRing } from "@/components/match-ring";
import { formatSalary, timeAgo, isFresh } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJobForUser(params.id);
  if (!job) notFound();

  const salary = formatSalary(
    job.salary_min,
    job.salary_max,
    job.salary_currency ?? "INR",
    job.salary_period,
  );
  const fresh = isFresh(job.posted_at);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </Button>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{job.role}</h1>
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <Building2 className="h-4 w-4" /> {job.company_name}
            </p>
          </div>
          {job.match && <MatchRing score={job.match.match_score} size={64} />}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {fresh && <Badge variant="fresh">⚡ Fresh · {timeAgo(job.posted_at)}</Badge>}
          {job.match && <Badge variant="match">🎯 {job.match.match_score}% match</Badge>}
          {job.referral_available && <Badge variant="referral">🤝 Referral available</Badge>}
          {salary && <Badge variant="secondary">💰 {salary}</Badge>}
          {job.is_hidden_job && (
            <Badge variant="outline">Hidden signal · {job.hidden_job_score}</Badge>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {job.location}
            </span>
          )}
          <span className="capitalize">{job.work_mode}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" /> Posted {timeAgo(job.posted_at)}
          </span>
        </div>

        {/* Who posted it */}
        {job.is_hiring_manager_post && job.contact_person && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/40 p-3 text-sm">
            <UserCheck className="h-4 w-4 text-primary" />
            <span>
              Posted by <span className="font-medium">{job.contact_person}</span>
              {job.contact_role ? ` · ${job.contact_role}` : ""} (hiring manager / recruiter)
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          {job.application_url ? (
            <Button asChild>
              <a href={job.application_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Apply
              </a>
            </Button>
          ) : job.application_email ? (
            <Button asChild>
              <a href={`mailto:${job.application_email}`}>Apply via email</a>
            </Button>
          ) : (
            <Badge variant="muted">Apply method: {job.application_method ?? "unknown"}</Badge>
          )}
          {job.referral_available && (
            <Button variant="outline" asChild>
              <Link href={`/referrals?company=${encodeURIComponent(job.company_name)}`}>
                Get a referral
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Match breakdown */}
      {job.match && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Why this matches you</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {job.match.why_candidate_is_a_fit}
          </p>

          {job.match.breakdown && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(job.match.breakdown).map(([k, v]) => (
                <div key={k} className="rounded-lg border p-3">
                  <p className="text-xs capitalize text-muted-foreground">{k}</p>
                  <p className="text-lg font-semibold tabular-nums">{v}%</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Matching skills</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {job.match.matching_skills.length ? (
                  job.match.matching_skills.map((s) => (
                    <Badge key={s} variant="success">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Skills to build</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {job.match.missing_skills.length ? (
                  job.match.missing_skills.map((s) => (
                    <Badge key={s} variant="warning">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {!!job.match.potential_concerns.length && (
            <div className="mt-4">
              <p className="text-sm font-medium">Things to consider</p>
              <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                {job.match.potential_concerns.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">About the role</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
            {job.description}
          </p>
        </div>
      )}

      {/* Trust */}
      <div className="flex items-start gap-2 rounded-lg border bg-accent/30 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Confidence {job.confidence_score}/100 · Scam risk {job.scam_score}/100. We
          surface source and freshness so you can judge legitimacy. Never pay anyone
          for a job or referral.
        </p>
      </div>
    </div>
  );
}
