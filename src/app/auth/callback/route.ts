import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the email-confirmation / OAuth redirect. Exchanges the code for a
 * session, then routes the user to onboarding or dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Decide landing page based on onboarding state.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("onboarded")
          .eq("id", user.id)
          .single();
        const dest = profile?.onboarded ? next : "/onboarding";
        return NextResponse.redirect(`${origin}${dest}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
