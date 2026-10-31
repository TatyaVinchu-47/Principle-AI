import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Minimal admin overview (full approve/reject workflow + duplicate/scam queues
 * are Phase 5). Gated by users.is_admin. Reads counts via the user's session;
 * approved jobs are visible to all, pending/rejected require admin (RLS).
 */
export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user!.id)
    .single();
  if (!me?.is_admin) redirect("/dashboard");

  const head = { count: "exact" as const, head: true };
  const [approved, pending, rejected, dupes, referrals, users, apps] = await Promise.all([
    supabase.from("jobs").select("id", head).eq("status", "approved"),
    supabase.from("jobs").select("id", head).eq("status", "pending"),
    supabase.from("jobs").select("id", head).eq("status", "rejected"),
    supabase.from("jobs").select("id", head).eq("status", "duplicate"),
    supabase.from("referral_opportunities").select("id", head),
    supabase.from("users").select("id", head),
    supabase.from("applications").select("id", head),
  ]);

  const cards = [
    { label: "Jobs collected", value: approved.count ?? 0 },
    { label: "Awaiting verification", value: pending.count ?? 0, variant: "warning" as const },
    { label: "Rejected", value: rejected.count ?? 0, variant: "danger" as const },
    { label: "Duplicates", value: dupes.count ?? 0 },
    { label: "Referral opportunities", value: referrals.count ?? 0 },
    { label: "Users", value: users.count ?? 0 },
    { label: "Applications", value: apps.count ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-primary" /> Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Operational overview. Approve/reject queues and scam flags land in Phase 5.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-semibold tabular-nums">{c.value}</span>
              {c.variant && c.value > 0 && <Badge variant={c.variant}>review</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
