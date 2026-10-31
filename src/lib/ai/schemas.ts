import { z } from "zod";

// ---- Resume extraction ----
export const ResumeExtractionSchema = z.object({
  education: z
    .array(
      z.object({
        institution: z.string().optional().default(""),
        degree: z.string().optional().default(""),
        field: z.string().optional().default(""),
        start_year: z.union([z.number(), z.string()]).optional(),
        end_year: z.union([z.number(), z.string()]).optional(),
        grade: z.string().optional().default(""),
      }),
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  projects: z
    .array(
      z.object({
        name: z.string().optional().default(""),
        description: z.string().optional().default(""),
        tech: z.array(z.string()).optional().default([]),
        link: z.string().optional().default(""),
      }),
    )
    .default([]),
  internships: z
    .array(
      z.object({
        company: z.string().optional().default(""),
        role: z.string().optional().default(""),
        start: z.string().optional().default(""),
        end: z.string().optional().default(""),
        description: z.string().optional().default(""),
      }),
    )
    .default([]),
  work_experience: z
    .array(
      z.object({
        company: z.string().optional().default(""),
        role: z.string().optional().default(""),
        start: z.string().optional().default(""),
        end: z.string().optional().default(""),
        description: z.string().optional().default(""),
      }),
    )
    .default([]),
  achievements: z.array(z.string()).default([]),
  preferred_roles: z.array(z.string()).default([]),
  location: z.string().optional().default(""),
  seniority: z
    .enum(["intern", "entry", "junior", "mid", "senior", "unknown"])
    .optional()
    .default("unknown"),
  summary: z.string().optional().default(""),
});
export type ResumeExtraction = z.infer<typeof ResumeExtractionSchema>;

// ---- Job classification ----
export const JobClassificationSchema = z.object({
  is_hiring_opportunity: z.boolean(),
  company: z.string().nullable().default(null),
  role: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  work_mode: z.enum(["onsite", "remote", "hybrid", "unknown"]).default("unknown"),
  experience_min: z.number().nullable().default(null),
  experience_max: z.number().nullable().default(null),
  salary_min: z.number().nullable().default(null),
  salary_max: z.number().nullable().default(null),
  salary_currency: z.string().nullable().default("INR"),
  salary_period: z.string().nullable().default("month"),
  required_skills: z.array(z.string()).default([]),
  application_method: z
    .enum(["url", "email", "dm", "form", "unknown"])
    .default("unknown"),
  application_url: z.string().nullable().default(null),
  application_email: z.string().nullable().default(null),
  contact_person: z.string().nullable().default(null),
  contact_role: z.string().nullable().default(null),
  posted_time: z.string().nullable().default(null),
  deadline: z.string().nullable().default(null),
  is_hiring_manager_post: z.boolean().default(false),
  is_hidden_job: z.boolean().default(false),
  hidden_job_score: z.number().min(0).max(100).default(0),
  confidence_score: z.number().min(0).max(100).default(0),
});
export type JobClassification = z.infer<typeof JobClassificationSchema>;

// ---- Match scoring ----
export const MatchSchema = z.object({
  match_score: z.number().min(0).max(100),
  matching_skills: z.array(z.string()).default([]),
  missing_skills: z.array(z.string()).default([]),
  relevant_projects: z.array(z.string()).default([]),
  why_candidate_is_a_fit: z.string().default(""),
  potential_concerns: z.array(z.string()).default([]),
});
export type MatchResult = z.infer<typeof MatchSchema>;
