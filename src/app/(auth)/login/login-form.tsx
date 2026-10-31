"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { login, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Logging in…" : "Log in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(login, undefined);
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const checkEmail = params.get("checkEmail");

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />

      {checkEmail && (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
          Account created. Check your email to confirm, then log in.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
