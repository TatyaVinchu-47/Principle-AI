import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { SubmitPostDialog } from "@/components/submit-post-dialog";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: appUser } = await supabase
    .from("users")
    .select("full_name, email, onboarded, is_admin")
    .eq("id", user.id)
    .single();

  // Gate: force onboarding unless already done. The /onboarding route lives
  // outside this layout group, so redirecting here is safe (no loop).
  if (appUser && !appUser.onboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar isAdmin={appUser?.is_admin ?? false} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="text-sm text-muted-foreground">
            Find jobs when they&apos;re posted.
          </div>
          <div className="flex items-center gap-3">
            <SubmitPostDialog />
            <UserMenu name={appUser?.full_name ?? null} email={appUser?.email ?? user.email ?? ""} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
