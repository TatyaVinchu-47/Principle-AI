"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RemotePref } from "@/lib/types";
import { completeOnboardingAction, parseResumeAction } from "./actions";

type Extraction = {
  skills?: string[];
  education?: { institution?: string; degree?: string }[];
  projects?: { name?: string }[];
  summary?: string;
  seniority?: string;
  location?: string;
  preferred_roles?: string[];
} | null;

const STEPS = ["About you", "Resume", "Target & location", "Skills & experience", "Review"];

export function OnboardingWizard({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState(defaultName);
  const [college, setCollege] = useState("");
  const [graduationYear, setGraduationYear] = useState<string>("");

  // Step 2 — resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [extraction, setExtraction] = useState<Extraction>(null);
  const [extractionSource, setExtractionSource] = useState<"ai" | "heuristic" | null>(null);
  const [resumeName, setResumeName] = useState<string>("");

  // Step 3
  const [targetRoles, setTargetRoles] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [remotePreference, setRemotePreference] = useState<RemotePref>("any");

  // Step 4
  const [skills, setSkills] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [minStipend, setMinStipend] = useState("");
  const [preferredCompanies, setPreferredCompanies] = useState("");

  const progress = ((step + 1) / STEPS.length) * 100;

  async function handleParseResume() {
    if (!resumeFile) {
      setError("Please choose a resume file first.");
      return;
    }
    setError(null);
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("resume", resumeFile);
      const res = await parseResumeAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setExtraction(res.extraction);
      setExtractionSource(res.source);
      setResumeName(res.fileName);
      // Prefill downstream fields from extraction (user can edit).
      if (res.extraction.skills?.length && !skills) {
        setSkills(res.extraction.skills.join(", "));
      }
      if (res.extraction.preferred_roles?.length && !targetRoles) {
        setTargetRoles(res.extraction.preferred_roles.join(", "));
      }
      if (res.extraction.location && !preferredLocations) {
        setPreferredLocations(res.extraction.location);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong parsing your resume.");
    } finally {
      setParsing(false);
    }
  }

  function next() {
    setError(null);
    // Light validation per step
    if (step === 0 && (!name.trim() || !college.trim())) {
      setError("Please enter your name and college.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function finish() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction({
        name: name.trim(),
        college: college.trim(),
        graduationYear: graduationYear ? Number(graduationYear) : null,
        targetRoles: listify(targetRoles),
        preferredLocations: listify(preferredLocations),
        remotePreference,
        skills: listify(skills),
        experienceYears: Number(experienceYears) || 0,
        minStipend: minStipend ? Number(minStipend) : null,
        preferredCompanies: listify(preferredCompanies),
        extraction: extraction as Record<string, unknown> | null,
      });
      if (result?.error) setError(result.error);
      // On success the action redirects to /dashboard.
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{STEPS[step]}</span>
          <span className="text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="rounded-xl border bg-card p-6 animate-fade-in">
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={defaultEmail} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="college">College</Label>
              <Input
                id="college"
                placeholder="e.g. IIT Jodhpur"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grad">Graduation year</Label>
              <Input
                id="grad"
                type="number"
                placeholder="2026"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="resume">Upload your resume</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                PDF or TXT, up to 8MB. We extract your skills, projects, and
                experience automatically.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-accent/40">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">
                {resumeFile ? resumeFile.name : "Click to choose a file"}
              </span>
              <input
                id="resume"
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => {
                  setResumeFile(e.target.files?.[0] ?? null);
                  setExtraction(null);
                }}
              />
            </label>

            <Button
              type="button"
              onClick={handleParseResume}
              disabled={!resumeFile || parsing}
              variant="secondary"
              className="w-full"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Extracting…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Extract with AI
                </>
              )}
            </Button>

            {extraction && (
              <div className="rounded-lg border bg-accent/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Parsed {resumeName}</span>
                  <Badge variant={extractionSource === "ai" ? "match" : "muted"}>
                    {extractionSource === "ai" ? "AI extracted" : "Heuristic"}
                  </Badge>
                </div>
                {extraction.summary && (
                  <p className="mb-2 text-sm text-muted-foreground">{extraction.summary}</p>
                )}
                {!!extraction.skills?.length && (
                  <div className="flex flex-wrap gap-1.5">
                    {extraction.skills.slice(0, 12).map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              You can skip extraction and fill in details manually on the next steps.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="roles">Target roles</Label>
              <Textarea
                id="roles"
                placeholder="Product Management Intern, Data Analyst, Associate Software Engineer"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Comma-separated.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locations">Preferred locations</Label>
              <Input
                id="locations"
                placeholder="Bangalore, Remote, Mumbai"
                value={preferredLocations}
                onChange={(e) => setPreferredLocations(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remote preference</Label>
              <Select
                value={remotePreference}
                onValueChange={(v) => setRemotePreference(v as RemotePref)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="skills">Skills</Label>
              <Textarea
                id="skills"
                placeholder="SQL, Python, Product Sense, React, Analytics"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Comma-separated.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp">Experience (years)</Label>
                <Input
                  id="exp"
                  type="number"
                  step="0.5"
                  min="0"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stipend">Min stipend (₹/mo)</Label>
                <Input
                  id="stipend"
                  type="number"
                  placeholder="20000"
                  value={minStipend}
                  onChange={(e) => setMinStipend(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companies">Preferred companies</Label>
              <Input
                id="companies"
                placeholder="Razorpay, Zomato, Postman"
                value={preferredCompanies}
                onChange={(e) => setPreferredCompanies(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Review your profile</h3>
            <dl className="divide-y text-sm">
              <Row label="Name" value={name} />
              <Row label="College" value={college} />
              <Row label="Graduation" value={graduationYear || "—"} />
              <Row label="Resume" value={resumeName || "Not uploaded"} />
              <Row label="Target roles" value={listify(targetRoles).join(", ") || "—"} />
              <Row label="Locations" value={listify(preferredLocations).join(", ") || "—"} />
              <Row label="Remote" value={remotePreference} />
              <Row label="Skills" value={`${listify(skills).length} skills`} />
              <Row label="Experience" value={`${experienceYears} yrs`} />
              <Row label="Min stipend" value={minStipend ? `₹${minStipend}/mo` : "—"} />
              <Row
                label="Preferred companies"
                value={listify(preferredCompanies).join(", ") || "—"}
              />
            </dl>
            <p className="text-xs text-muted-foreground">
              We&apos;ll match you against fresh jobs immediately. You can edit all of
              this later from your profile.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0 || pending}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={pending}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Finishing…
                </>
              ) : (
                <>Finish & see jobs</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function listify(v: string): string[] {
  return v
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
