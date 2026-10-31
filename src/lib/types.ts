// ============================================================================
// Shared application types. These mirror the Supabase schema (0001_init.sql).
// Kept hand-written (vs. generated) so the app is readable and self-contained.
// ============================================================================

export type WorkMode = "onsite" | "remote" | "hybrid" | "unknown";
export type RemotePref = "onsite" | "remote" | "hybrid" | "any";
export type JobStatus = "pending" | "approved" | "rejected" | "duplicate" | "expired";
export type SourceKind =
  | "career_page"
  | "public_feed"
  | "x_signal"
  | "user_submitted"
  | "api_provider";

export type ApplicationStatus =
  | "discovered"
  | "viewed"
  | "saved"
  | "applied"
  | "referral_requested"
  | "referral_received"
  | "assessment"
  | "interview"
  | "rejected"
  | "offer"
  | "withdrawn";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "discovered",
  "viewed",
  "saved",
  "applied",
  "referral_requested",
  "referral_received",
  "assessment",
  "interview",
  "rejected",
  "offer",
  "withdrawn",
];

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  onboarded: boolean;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface EducationItem {
  institution?: string;
  degree?: string;
  field?: string;
  start_year?: number | string;
  end_year?: number | string;
  grade?: string;
}

export interface ProjectItem {
  name?: string;
  description?: string;
  tech?: string[];
  link?: string;
}

export interface ExperienceItem {
  company?: string;
  role?: string;
  start?: string;
  end?: string;
  description?: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  college: string | null;
  graduation_year: number | null;
  target_roles: string[];
  preferred_locations: string[];
  remote_preference: RemotePref;
  skills: string[];
  experience_years: number;
  min_stipend: number | null;
  preferred_companies: string[];
  education: EducationItem[];
  projects: ProjectItem[];
  internships: ExperienceItem[];
  work_experience: ExperienceItem[];
  achievements: string[];
  extracted_roles: string[];
  extracted_location: string | null;
  seniority: string | null;
  resume_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  raw_text: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string | null;
  website: string | null;
  logo_url: string | null;
  industry: string | null;
  hq_location: string | null;
  verified: boolean;
}

export interface Job {
  id: string;
  company_id: string | null;
  source_id: string | null;
  hiring_post_id: string | null;
  company_name: string;
  role: string;
  description: string | null;
  location: string | null;
  work_mode: WorkMode;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  required_skills: string[];
  application_method: string | null;
  application_url: string | null;
  application_email: string | null;
  contact_person: string | null;
  contact_role: string | null;
  is_hiring_manager_post: boolean;
  is_hidden_job: boolean;
  hidden_job_score: number;
  scam_score: number;
  confidence_score: number;
  status: JobStatus;
  posted_at: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchDetail {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  relevant_projects: string[];
  why_candidate_is_a_fit: string;
  potential_concerns: string[];
  breakdown?: {
    role: number;
    skills: number;
    experience: number;
    location: number;
    resume: number;
    preferences: number;
  };
}

/** A job plus the viewing user's match + saved/applied state (for cards). */
export interface JobWithMatch extends Job {
  match?: MatchDetail | null;
  saved?: boolean;
  application_status?: ApplicationStatus | null;
  referral_available?: boolean;
}

export interface ReferralOpportunity {
  id: string;
  company_id: string | null;
  company_name: string;
  person_name: string;
  person_role: string | null;
  profile_url: string | null;
  referral_post_url: string | null;
  post_text: string | null;
  roles_mentioned: string[];
  referral_evidence: string;
  confidence_score: number;
  posted_at: string | null;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  match_score: number | null;
  match_detail: MatchDetail | null;
  applied_via: string | null;
  applied_at: string | null;
  recipient_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
