import { Handshake, ShieldCheck, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/utils";
import type { ReferralOpportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: { company?: string };
}) {
  const supabase = createClient();
  const company = searchParams.company?.trim();

  let query = supabase
    .from("referral_opportunities")
    .select("*")
    .order("posted_at", { ascending: false });
  if (company) query = query.ilike("company_name", `%${company}%`);

  const { data } = await query;
  const referrals = (data ?? []) as ReferralOpportunity[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Handshake className="h-6 w-6 text-violet-500" /> Referral opportunities
        </h1>
        <p className="text-sm text-muted-foreground">
          {company
            ? `People who publicly offered referrals for ${company}.`
            : "People who publicly said they give referrals. We never cold-message employees."}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-accent/30 p-3 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Every referral here is backed by a public post. We only surface people
          with explicit referral intent — and we never ask you to pay anyone for a
          referral.
        </p>
      </div>

      {referrals.length ? (
        <div className="grid gap-4">
          {referrals.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-11 w-11">
                  <AvatarFallback>{initials(r.person_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{r.person_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {r.person_role ? `${r.person_role} @ ` : ""}
                        {r.company_name}
                      </p>
                    </div>
                    <Badge variant="referral">Confidence {r.confidence_score}</Badge>
                  </div>

                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium text-foreground">Referral evidence</p>
                    <p className="mt-1 text-muted-foreground">{r.referral_evidence}</p>
                  </div>

                  {!!r.roles_mentioned.length && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.roles_mentioned.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {r.posted_at && <span>Posted {timeAgo(r.posted_at)}</span>}
                    {r.referral_post_url && (
                      <a
                        href={r.referral_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Source post
                      </a>
                    )}
                  </div>

                  <div className="mt-4">
                    <Badge variant="muted">
                      Request &amp; AI message — available in Phase 3
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Handshake}
          title="No referral opportunities found"
          description={
            company
              ? `We haven't found anyone publicly offering referrals for ${company} yet.`
              : "When someone publicly offers referrals, they'll appear here with evidence."
          }
        />
      )}
    </div>
  );
}
