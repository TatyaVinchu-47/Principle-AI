"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CandidateProfile, RemotePref } from "@/lib/types";
import { updatePreferences } from "@/app/(app)/actions";

function listify(v: string): string[] {
  return v
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function PreferencesForm({ profile }: { profile: CandidateProfile }) {
  const [college, setCollege] = useState(profile.college ?? "");
  const [graduationYear, setGraduationYear] = useState(
    profile.graduation_year?.toString() ?? "",
  );
  const [targetRoles, setTargetRoles] = useState(profile.target_roles.join(", "));
  const [preferredLocations, setPreferredLocations] = useState(
    profile.preferred_locations.join(", "),
  );
  const [remotePreference, setRemotePreference] = useState<RemotePref>(
    profile.remote_preference,
  );
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [experienceYears, setExperienceYears] = useState(
    profile.experience_years.toString(),
  );
  const [minStipend, setMinStipend] = useState(profile.min_stipend?.toString() ?? "");
  const [preferredCompanies, setPreferredCompanies] = useState(
    profile.preferred_companies.join(", "),
  );

  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updatePreferences({
        college: college.trim(),
        graduationYear: graduationYear ? Number(graduationYear) : null,
        targetRoles: listify(targetRoles),
        preferredLocations: listify(preferredLocations),
        remotePreference,
        skills: listify(skills),
        experienceYears: Number(experienceYears) || 0,
        minStipend: minStipend ? Number(minStipend) : null,
        preferredCompanies: listify(preferredCompanies),
      });
      if ("error" in res) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <div className="space-y-5 rounded-xl border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="college">College</Label>
          <Input id="college" value={college} onChange={(e) => setCollege(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="grad">Graduation year</Label>
          <Input
            id="grad"
            type="number"
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="roles">Target roles</Label>
        <Textarea id="roles" value={targetRoles} onChange={(e) => setTargetRoles(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="locations">Preferred locations</Label>
          <Input
            id="locations"
            value={preferredLocations}
            onChange={(e) => setPreferredLocations(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Remote preference</Label>
          <Select value={remotePreference} onValueChange={(v) => setRemotePreference(v as RemotePref)}>
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

      <div className="space-y-1.5">
        <Label htmlFor="skills">Skills</Label>
        <Textarea id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            value={minStipend}
            onChange={(e) => setMinStipend(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="companies">Preferred companies</Label>
        <Input
          id="companies"
          value={preferredCompanies}
          onChange={(e) => setPreferredCompanies(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save preferences"
          )}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" /> Saved — matches updated
          </span>
        )}
      </div>
    </div>
  );
}
