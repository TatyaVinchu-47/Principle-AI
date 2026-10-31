import Link from "next/link";
import { Brand } from "@/components/brand";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center">
        <Link href="/">
          <Brand />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build your profile once. We handle the discovery.
          </p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
