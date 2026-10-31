import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { PreferencesForm } from "./preferences-form";
import type { CandidateProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", user!.id)
    .single();
  const profile = data as CandidateProfile | null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <SlidersHorizontal className="h-6 w-6 text-primary" /> Preferences
        </h1>
        <p className="text-sm text-muted-foreground">
          These drive your match scores. Update them any time.
        </p>
      </div>

      {profile ? (
        <PreferencesForm profile={profile} />
      ) : (
        <EmptyState
          icon={SlidersHorizontal}
          title="Complete onboarding first"
          description="We need your profile before you can tune preferences."
        >
          <Button asChild>
            <Link href="/onboarding">Start onboarding</Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
}
