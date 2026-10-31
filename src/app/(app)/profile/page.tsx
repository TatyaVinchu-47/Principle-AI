import Link from "next/link";
import { UserRound, FileText, GraduationCap, Briefcase, FolderGit2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { CandidateProfile, Resume } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: appUser }, { data: profileData }, { data: resumeData }] =
    await Promise.all([
      supabase.from("users").select("full_name, email").eq("id", user!.id).single(),
      supabase.from("candidate_profiles").select("*").eq("user_id", user!.id).single(),
      supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

  const profile = profileData as CandidateProfile | null;
  const resume = resumeData as Resume | null;

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={UserRound}
          title="No profile yet"
          description="Complete onboarding to build your structured profile."
        >
          <Button asChild>
            <Link href="/onboarding">Start onboarding</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <UserRound className="h-6 w-6 text-primary" /> Profile &amp; resume
        </h1>
        <Button asChild variant="outline">
          <Link href="/preferences">Edit preferences</Link>
        </Button>
      </div>

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle>{appUser?.full_name ?? "Student"}</CardTitle>
          <p className="text-sm text-muted-foreground">{appUser?.email}</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="College" value={profile.college} />
          <Field
            label="Graduation year"
            value={profile.graduation_year?.toString() ?? null}
          />
          <Field label="Seniority" value={profile.seniority} />
          <Field label="Experience" value={`${profile.experience_years} yrs`} />
          <Field label="Location" value={profile.extracted_location} />
          <Field label="Remote preference" value={profile.remote_preference} />
        </CardContent>
      </Card>

      {resume && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{resume.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {resume.size_bytes
                    ? `${Math.round(resume.size_bytes / 1024)} KB`
                    : ""}
                </p>
              </div>
              <Badge variant="success">Primary</Badge>
            </div>
            {profile.resume_summary && (
              <p className="mt-3 text-sm text-muted-foreground">
                {profile.resume_summary}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.skills.length ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      {profile.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4" /> Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.education.map((e, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">
                  {e.degree} {e.field ? `· ${e.field}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {e.institution}
                  {e.end_year ? ` · ${e.end_year}` : ""}
                  {e.grade ? ` · ${e.grade}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Projects */}
      {profile.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderGit2 className="h-4 w-4" /> Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.projects.map((p, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">{p.name}</p>
                {p.description && (
                  <p className="text-muted-foreground">{p.description}</p>
                )}
                {!!p.tech?.length && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.tech.map((t) => (
                      <Badge key={t} variant="muted">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Experience */}
      {(profile.internships.length > 0 || profile.work_experience.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" /> Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...profile.internships, ...profile.work_experience].map((w, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">
                  {w.role} {w.company ? `· ${w.company}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {w.start} {w.end ? `– ${w.end}` : ""}
                </p>
                {w.description && (
                  <p className="text-muted-foreground">{w.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
