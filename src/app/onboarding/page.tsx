import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("users")
    .select("full_name, email, onboarded")
    .eq("id", user.id)
    .single();

  if (appUser?.onboarded) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Brand />
        <span className="text-sm text-muted-foreground">Let&apos;s build your profile</span>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 py-10">
        <OnboardingWizard
          defaultName={appUser?.full_name ?? ""}
          defaultEmail={appUser?.email ?? user.email ?? ""}
        />
      </main>
    </div>
  );
}
