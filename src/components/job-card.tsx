"use client";

import { useState, useTransition } from "react";
import {
  Bookmark,
  BookmarkCheck,
  MapPin,
  Sparkles,
  ExternalLink,
  Handshake,
  Send,
  UserCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchRing } from "@/components/match-ring";
import { cn, formatSalary, timeAgo, isFresh } from "@/lib/utils";
import type { JobWithMatch } from "@/lib/types";
import { markApplied, markViewed, toggleSaveJob } from "@/app/(app)/actions";

const WORK_MODE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unknown: "—",
};

export function JobCard({ job }: { job: JobWithMatch }) {
  const [saved, setSaved] = useState(!!job.saved);
  const [applied, setApplied] = useState(job.application_status === "applied");
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();

  const salary = formatSalary(
    job.salary_min,
    job.salary_max,
    job.salary_currency ?? "INR",
    job.salary_period,
  );
  const fresh = isFresh(job.posted_at);
  const score = job.match?.match_score ?? null;

  function onSave() {
    start(async () => {
      const res = await toggleSaveJob(job.id);
      setSaved(res.saved);
    });
  }

  function onApply() {
    // External apply: open the application link + record it.
    const href = job.application_url ?? null;
    start(async () => {
      await markApplied(job.id, "external");
      setApplied(true);
    });
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  }

  function onView() {
    // Fire-and-forget view tracking.
    void markViewed(job.id);
  }

  return (
    <div className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Logo placeholder */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
          {job.company_name.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/jobs/${job.id}`}
                onClick={onView}
                className="line-clamp-1 font-semibold hover:underline"
              >
                {job.role}
              </Link>
              <p className="text-sm text-muted-foreground">{job.company_name}</p>
            </div>
            {score != null && <MatchRing score={score} />}
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {fresh && <Badge variant="fresh">⚡ Fresh · {timeAgo(job.posted_at)}</Badge>}
            {!fresh && (
              <Badge variant="muted">Posted {timeAgo(job.posted_at)}</Badge>
            )}
            {score != null && <Badge variant="match">🎯 {score}% match</Badge>}
            {job.referral_available && (
              <Badge variant="referral">🤝 Referral</Badge>
            )}
            {salary && <Badge variant="secondary">💰 {salary}</Badge>}
            {job.work_mode === "remote" && <Badge variant="secondary">🏠 Remote</Badge>}
            {job.is_hidden_job && (
              <Badge variant="outline">Hidden · {job.hidden_job_score}</Badge>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {job.location}
              </span>
            )}
            <span>{WORK_MODE_LABEL[job.work_mode]}</span>
            {job.is_hiring_manager_post && job.contact_person && (
              <span className="inline-flex items-center gap-1 text-foreground">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                {job.contact_person}
                {job.contact_role ? ` · ${job.contact_role}` : ""}
              </span>
            )}
          </div>

          {/* Match detail (expandable) */}
          {job.match && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded((e) => !e)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? (
                  <>
                    Hide match detail <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Why this matches <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
              {expanded && (
                <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <p>{job.match.why_candidate_is_a_fit}</p>
                  {!!job.match.matching_skills.length && (
                    <div className="flex flex-wrap gap-1">
                      {job.match.matching_skills.map((s) => (
                        <Badge key={s} variant="success">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {!!job.match.missing_skills.length && (
                    <div className="flex flex-wrap gap-1">
                      {job.match.missing_skills.map((s) => (
                        <Badge key={s} variant="warning">
                          missing: {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {!!job.match.potential_concerns.length && (
                    <ul className="list-inside list-disc text-muted-foreground">
                      {job.match.potential_concerns.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onApply} disabled={pending || applied}>
              {applied ? (
                "Applied"
              ) : (
                <>
                  {job.application_url ? <ExternalLink className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  Apply
                </>
              )}
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/jobs/${job.id}?ai=1`}>
                <Sparkles className="h-4 w-4" /> Apply with AI
              </Link>
            </Button>
            {job.referral_available && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/referrals?company=${encodeURIComponent(job.company_name)}&job=${job.id}`}>
                  <Handshake className="h-4 w-4" /> Get Referral
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onSave}
              disabled={pending}
              className={cn(saved && "text-primary")}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
