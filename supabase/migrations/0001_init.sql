-- ============================================================================
-- Principle AI — Initial schema
-- Target: Supabase PostgreSQL
--
-- This migration creates the full data model for all phases so the schema is
-- stable from the start. Phase 1 actively uses: users, candidate_profiles,
-- resumes, jobs, companies, job_sources, saved_jobs, applications, events.
-- Later phases use: hiring_posts, referral_opportunities, referral_requests,
-- notifications.
--
-- Run order:
--   1) 0001_init.sql        (this file)
--   2) 0002_seed.sql        (demo data)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";   -- for semantic matching embeddings

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type work_mode as enum ('onsite', 'remote', 'hybrid', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type remote_pref as enum ('onsite', 'remote', 'hybrid', 'any');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('pending', 'approved', 'rejected', 'duplicate', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_kind as enum (
    'career_page', 'public_feed', 'x_signal', 'user_submitted', 'api_provider'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum (
    'discovered', 'viewed', 'saved', 'applied', 'referral_requested',
    'referral_received', 'assessment', 'interview', 'rejected', 'offer', 'withdrawn'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type referral_request_status as enum (
    'draft', 'approved', 'sent', 'responded', 'declined'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_channel as enum ('in_app', 'whatsapp', 'email');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- users  (mirrors auth.users; app-level profile shell)
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text,
  avatar_url    text,
  is_admin      boolean not null default false,
  onboarded     boolean not null default false,
  whatsapp_number text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_users_updated before update on public.users
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- companies
-- ----------------------------------------------------------------------------
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique,
  website       text,
  logo_url      text,
  industry      text,
  hq_location   text,
  verified      boolean not null default false,  -- company verification (trust & safety)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists idx_companies_name_lower on public.companies (lower(name));
create trigger trg_companies_updated before update on public.companies
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- job_sources  (ingestion adapters registry)
-- ----------------------------------------------------------------------------
create table if not exists public.job_sources (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  kind          source_kind not null,
  base_url      text,
  trust_weight  numeric(4,2) not null default 0.5,  -- 0..1 source trust
  enabled       boolean not null default true,
  config        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_job_sources_updated before update on public.job_sources
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- candidate_profiles  (structured, AI-extracted + onboarding)
-- ----------------------------------------------------------------------------
create table if not exists public.candidate_profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid unique not null references public.users(id) on delete cascade,
  -- onboarding fields
  college            text,
  graduation_year    int,
  target_roles       text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  remote_preference  remote_pref not null default 'any',
  skills             text[] not null default '{}',
  experience_years   numeric(4,1) not null default 0,
  min_stipend        int,                 -- monthly, INR
  preferred_companies text[] not null default '{}',
  -- AI-extracted resume structure (strict JSON)
  education          jsonb not null default '[]'::jsonb,
  projects           jsonb not null default '[]'::jsonb,
  internships        jsonb not null default '[]'::jsonb,
  work_experience    jsonb not null default '[]'::jsonb,
  achievements       jsonb not null default '[]'::jsonb,
  extracted_roles    text[] not null default '{}',
  extracted_location text,
  seniority          text,                -- intern / entry / junior / mid ...
  resume_summary     text,
  embedding          vector(1536),        -- profile embedding for semantic match
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_profiles_user on public.candidate_profiles(user_id);
create trigger trg_profiles_updated before update on public.candidate_profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- resumes  (files in Supabase Storage bucket 'resumes')
-- ----------------------------------------------------------------------------
create table if not exists public.resumes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  storage_path  text not null,            -- e.g. '<user_id>/resume-xxxx.pdf'
  file_name     text,
  mime_type     text,
  size_bytes    int,
  raw_text      text,                      -- extracted plain text
  is_primary    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_resumes_user on public.resumes(user_id);
create trigger trg_resumes_updated before update on public.resumes
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- hiring_posts  (raw ingested items before/after classification)
-- ----------------------------------------------------------------------------
create table if not exists public.hiring_posts (
  id              uuid primary key default gen_random_uuid(),
  source_id       uuid references public.job_sources(id) on delete set null,
  submitted_by    uuid references public.users(id) on delete set null,
  source_url      text,
  raw_text        text not null,
  raw_html        text,
  classified      boolean not null default false,
  classification  jsonb,                   -- strict JSON from AI classifier
  is_hiring_signal boolean,
  hidden_job_score int,                    -- 0..100
  dedupe_hash      text,                    -- for duplicate detection
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_hiring_posts_dedupe on public.hiring_posts(dedupe_hash);
create index if not exists idx_hiring_posts_classified on public.hiring_posts(classified);
create trigger trg_hiring_posts_updated before update on public.hiring_posts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- jobs  (structured, de-duplicated, matchable opportunities)
-- ----------------------------------------------------------------------------
create table if not exists public.jobs (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid references public.companies(id) on delete set null,
  source_id           uuid references public.job_sources(id) on delete set null,
  hiring_post_id      uuid references public.hiring_posts(id) on delete set null,
  company_name        text not null,       -- denormalized for fast cards
  role                text not null,
  description         text,
  location            text,
  work_mode           work_mode not null default 'unknown',
  experience_min      numeric(4,1),
  experience_max      numeric(4,1),
  salary_min          int,
  salary_max          int,
  salary_currency     text default 'INR',
  salary_period       text default 'month',
  required_skills     text[] not null default '{}',
  application_method  text,                -- 'url' | 'email' | 'dm' | 'form'
  application_url     text,
  application_email   text,
  contact_person      text,
  contact_role        text,
  is_hiring_manager_post boolean not null default false,
  is_hidden_job       boolean not null default false,
  hidden_job_score    int not null default 0,
  scam_score          int not null default 0,   -- trust & safety 0..100
  confidence_score    int not null default 0,    -- classifier confidence 0..100
  status              job_status not null default 'approved',
  posted_at           timestamptz,
  deadline            timestamptz,
  dedupe_hash         text,
  embedding           vector(1536),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_posted on public.jobs(posted_at desc);
create index if not exists idx_jobs_company on public.jobs(company_id);
create index if not exists idx_jobs_dedupe on public.jobs(dedupe_hash);
create index if not exists idx_jobs_hidden on public.jobs(is_hidden_job) where is_hidden_job;
create trigger trg_jobs_updated before update on public.jobs
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- referral_opportunities  (evidence-backed referrers)
-- ----------------------------------------------------------------------------
create table if not exists public.referral_opportunities (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid references public.companies(id) on delete set null,
  company_name     text not null,
  person_name      text not null,
  person_role      text,                   -- current role, e.g. 'Growth'
  profile_url      text,                   -- public profile/source URL
  referral_post_url text,
  post_text        text,
  roles_mentioned  text[] not null default '{}',
  referral_evidence text not null,          -- quote/paraphrase of the evidence
  confidence_score int not null default 0,   -- 0..100
  posted_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_referrals_company on public.referral_opportunities(company_id);
create index if not exists idx_referrals_company_name on public.referral_opportunities(lower(company_name));
create trigger trg_referrals_updated before update on public.referral_opportunities
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- applications  (per-user per-job tracking)
-- ----------------------------------------------------------------------------
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  job_id          uuid not null references public.jobs(id) on delete cascade,
  status          application_status not null default 'discovered',
  match_score     int,
  match_detail    jsonb,                   -- matching_skills, missing_skills, etc.
  applied_via     text,                    -- 'gmail' | 'external' | 'manual'
  applied_at      timestamptz,
  recipient_email text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, job_id)
);
create index if not exists idx_applications_user on public.applications(user_id);
create index if not exists idx_applications_status on public.applications(status);
create trigger trg_applications_updated before update on public.applications
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- saved_jobs
-- ----------------------------------------------------------------------------
create table if not exists public.saved_jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  job_id     uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index if not exists idx_saved_user on public.saved_jobs(user_id);

-- ----------------------------------------------------------------------------
-- referral_requests  (user -> referrer, requires explicit approval to send)
-- ----------------------------------------------------------------------------
create table if not exists public.referral_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  referral_id     uuid not null references public.referral_opportunities(id) on delete cascade,
  job_id          uuid references public.jobs(id) on delete set null,
  message         text,                    -- AI-generated, user-editable
  status          referral_request_status not null default 'draft',
  sent_via        text,
  sent_at         timestamptz,
  recipient       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_refreq_user on public.referral_requests(user_id);
create trigger trg_refreq_updated before update on public.referral_requests
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  channel     notification_channel not null default 'in_app',
  title       text not null,
  body        text,
  payload     jsonb not null default '{}'::jsonb,
  job_id      uuid references public.jobs(id) on delete set null,
  referral_id uuid references public.referral_opportunities(id) on delete set null,
  read_at     timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- events  (analytics / audit trail)
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete set null,
  type       text not null,               -- 'job_discovered','job_viewed','applied',...
  entity     text,                        -- 'job' | 'referral' | 'application'
  entity_id  uuid,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_type on public.events(type);
create index if not exists idx_events_user on public.events(user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Auto-provision public.users row when an auth user is created
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.users               enable row level security;
alter table public.candidate_profiles  enable row level security;
alter table public.resumes             enable row level security;
alter table public.applications        enable row level security;
alter table public.saved_jobs          enable row level security;
alter table public.referral_requests   enable row level security;
alter table public.notifications       enable row level security;
alter table public.events              enable row level security;
-- Public catalog tables: readable by authenticated users, writes via service role.
alter table public.jobs                   enable row level security;
alter table public.companies              enable row level security;
alter table public.job_sources            enable row level security;
alter table public.hiring_posts           enable row level security;
alter table public.referral_opportunities enable row level security;

-- helper: is current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false);
$$ language sql stable security definer;

-- users: a user can see/update only their own row (admins can see all)
create policy users_select_self on public.users
  for select using (auth.uid() = id or public.is_admin());
create policy users_update_self on public.users
  for update using (auth.uid() = id);

-- candidate_profiles
create policy profiles_rw_self on public.candidate_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- resumes
create policy resumes_rw_self on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- applications
create policy applications_rw_self on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_jobs
create policy saved_rw_self on public.saved_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- referral_requests
create policy refreq_rw_self on public.referral_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notifications
create policy notifications_rw_self on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- events: user can insert/read their own; admins read all
create policy events_insert_self on public.events
  for insert with check (auth.uid() = user_id or user_id is null);
create policy events_select_self on public.events
  for select using (auth.uid() = user_id or public.is_admin());

-- Public catalog: any authenticated user can read approved content.
create policy jobs_read_approved on public.jobs
  for select using (status = 'approved' or public.is_admin());
create policy companies_read_all on public.companies
  for select using (true);
create policy sources_read_all on public.job_sources
  for select using (public.is_admin());
create policy hiring_posts_admin on public.hiring_posts
  for select using (public.is_admin() or submitted_by = auth.uid());
create policy referrals_read_all on public.referral_opportunities
  for select using (true);

-- NOTE: inserts/updates to catalog tables (jobs, companies, hiring_posts,
-- referral_opportunities, job_sources) are performed with the service role key
-- from server code, which bypasses RLS. Admin approve/reject also runs server-side.
