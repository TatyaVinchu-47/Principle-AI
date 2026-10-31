import Link from "next/link";
import { ArrowRight, Clock, Target, Handshake, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 text-center">
        <Badge variant="match" className="mx-auto mb-5">
          🎯 Early discovery · high relevance · trusted referrals
        </Badge>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Find jobs when they are posted —{" "}
          <span className="text-primary">not when everyone has already applied.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
          Principle AI surfaces fresh hiring signals from hiring managers and
          recruiters, scores how well each role matches your resume, and finds
          legitimate referral opportunities — all backed by evidence.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Build my profile <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">I already have an account</Link>
          </Button>
        </div>
      </section>

      {/* Value props */}
      <section className="container grid gap-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Clock,
            title: "How fresh is this job?",
            body: "Every job shows exactly when and by whom it was posted. Freshness first.",
          },
          {
            icon: Target,
            title: "How good is my match?",
            body: "A transparent match score across role, skills, experience, and your preferences.",
          },
          {
            icon: Handshake,
            title: "Can I get a referral?",
            body: "We only surface people who publicly said they refer — never cold outreach.",
          },
          {
            icon: ShieldCheck,
            title: "Is it legitimate?",
            body: "Duplicate and scam detection, source URLs, and confidence scores on everything.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <Brand showText />
          <p>Built for Indian students & fresh graduates. Demo MVP.</p>
        </div>
      </footer>
    </div>
  );
}
