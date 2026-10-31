import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center">
        <Link href="/">
          <Brand />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in to see fresh jobs matched to your profile.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
