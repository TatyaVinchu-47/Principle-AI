# Principle AI

> **Find jobs when they are posted — not when everyone has already applied.**

Principle AI is an AI-powered job discovery and referral platform for Indian
college students and fresh graduates. It identifies fresh hiring signals (often
posted directly by hiring managers and recruiters), converts them into
structured, matchable opportunities, scores them against a candidate's resume
and preferences, and surfaces **evidence-backed** referral opportunities.

This repository contains a **fully functional Phase 1 MVP** plus the stable
schema, ingestion architecture, and automation hooks for Phases 2–5.

> _"Principle AI" is a temporary working name. The product is original and does
> not copy any other company's branding, UI, copy, or proprietary assets._

---

## What's built (Phase 1)

- **Auth** — email/password via Supabase Auth, session middleware, route protection.
- **Onboarding** — a 5-step wizard capturing all 12 required fields, with resume
  upload to Supabase Storage and AI structured extraction.
- **AI layer** — resume extraction, job classification, hidden-job scoring,
  scam heuristics, and a transparent weighted match engine. **Works with or
  without an OpenAI key** (deterministic heuristics are the fallback).
- **Job database + dashboard** — job cards with freshness, match %, referral and
  trust signals; recommended + latest-hidden sections; KPIs.
- **Job matching** — the exact spec weighting (role 30% · skills 25% ·
  experience 15% · location/work-mode 10% · resume/projects 10% · preferences 10%).
- **Modular ingestion** — adapter-based ingestion with a manual "submit a hiring
  post" flow and a machine-to-machine webhook for automation (n8n).
- **Application tracking** — all 11 statuses, editable pipeline.
- **Referral opportunities** — evidence-backed, read-only in Phase 1 (request +
  AI message flow is Phase 3).
- **Admin overview** — counts for collected / pending / rejected / duplicates.

Every job is designed to answer: _Who posted it? When? Why is it relevant to me?
Can I apply now? Is there a legitimate referral?_

---

## Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui-style components |
| Backend    | Next.js Route Handlers + Server Actions                       |
| Data       | Supabase PostgreSQL (with `pgvector`), Row Level Security     |
| Auth       | Supabase Auth                                                 |
| Storage    | Supabase Storage (private `resumes` bucket)                   |
| AI         | OpenAI (chat + embeddings), strict JSON, Zod validation       |
| Automation | n8n-compatible workflows hitting the ingestion webhook        |

---

## Getting started

### 1. Prerequisites

- Node.js 18.18+ (or 20+)
- A Supabase project (free tier is fine)
- _(Optional)_ An OpenAI API key — the app runs fully without one.

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in at minimum the three Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Add `OPENAI_API_KEY` to enable AI extraction/classification/match narratives.
Leave it blank to use the deterministic heuristic engines.

### 4. Run database migrations

In the Supabase SQL editor (or `psql`), run the migrations **in order**:

1. `supabase/migrations/0001_init.sql` — tables, enums, RLS, triggers
2. `supabase/migrations/0002_seed.sql` — demo companies, sources, jobs, referrals
3. `supabase/migrations/0003_storage.sql` — private `resumes` bucket + policies

> `0001` enables the `vector` extension. If your project doesn't have it,
> enable **Database → Extensions → vector** first.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000, sign up, complete onboarding, and you'll land on a
dashboard populated with the seeded jobs, scored against your profile.

### Useful scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # run the production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

---

## Architecture

```
src/
├─ app/
│  ├─ (auth)/            login, signup, auth actions
│  ├─ (app)/             authenticated shell (sidebar + topbar)
│  │  ├─ dashboard/      recommended + latest hidden jobs, KPIs
│  │  ├─ hidden/         hidden-job feed
│  │  ├─ referrals/      evidence-backed referral opportunities
│  │  ├─ applications/   pipeline tracker (11 statuses)
│  │  ├─ interviews/     assessment / interview / offer stages
│  │  ├─ saved/          saved jobs
│  │  ├─ profile/        structured profile + resume
│  │  ├─ preferences/    editable matching preferences
│  │  ├─ jobs/[id]/      job detail + match breakdown
│  │  ├─ admin/          admin overview (is_admin gated)
│  │  └─ actions.ts      save / apply / status / preferences server actions
│  ├─ onboarding/        multi-step wizard (own shell, outside app layout)
│  ├─ api/
│  │  ├─ jobs/           GET job listing with filters
│  │  ├─ ingest/         POST user-submitted hiring post
│  │  └─ webhooks/ingest/ POST machine-to-machine ingestion (secret-gated)
│  └─ auth/callback/     OAuth / email confirmation handler
├─ components/           UI + feature components (job-card, kpi-strip, …)
│  └─ ui/                shadcn/ui-style primitives
├─ lib/
│  ├─ ai/                openai, signals, schemas, resume, classify, match
│  ├─ ingestion/         ingest core + adapters (modular sources)
│  ├─ services/          jobs + stats data services (server-only)
│  ├─ supabase/          browser / server / admin / middleware clients
│  ├─ types.ts           shared domain types
│  └─ utils.ts           formatting (timeAgo, isFresh, formatSalary, …)
└─ middleware.ts         session refresh + route protection
```

### Data flow: ingestion → matching → card

```
raw post ─▶ AI Job Classifier ─▶ dedupe + scam + trust gate ─▶ jobs table
                                                                   │
candidate profile ─────────────────▶ computeMatch (weighted) ◀─────┘
                                                                   │
                                                          JobWithMatch ─▶ Job Card
```

### Match scoring

`src/lib/ai/match.ts` computes a **deterministic** score using the spec weights,
so scores are stable and explainable:

| Signal                | Weight |
| --------------------- | ------ |
| Role similarity       | 30%    |
| Skill similarity      | 25%    |
| Experience            | 15%    |
| Location / work mode  | 10%    |
| Resume / project fit  | 10%    |
| Candidate preferences | 10%    |

When an OpenAI key is present, `explainMatch()` enriches the _narrative_
(`why_candidate_is_a_fit`, concerns) **without changing the numeric score**.

### AI prompts & strict JSON

All AI calls request `response_format: json_object` and validate the result with
Zod (`src/lib/ai/schemas.ts`). If the key is missing or a call fails, the
deterministic fallbacks keep the product working:

- **Resume extraction** → `ResumeExtractionSchema` (education, skills, projects,
  internships, work experience, achievements, preferred roles, location, seniority).
- **Job classification** → `JobClassificationSchema` (company, role, location,
  work mode, experience, salary, skills, application method/URL, contact person
  & role, posted time, deadline, hiring-manager flag, hidden-job flag,
  `hidden_job_score`, `confidence_score`).
- **Match** → `MatchSchema` (`match_score`, `matching_skills`, `missing_skills`,
  `relevant_projects`, `why_candidate_is_a_fit`, `potential_concerns`).

### Hidden-job detection

`src/lib/ai/signals.ts` scans for hiring-signal phrases ("we're hiring", "DM your
resume", "looking for", "referrals", "internship", …) and assigns a
`hidden_job_score` (0–100). **A job is only marked hidden when there is evidence
of a direct hiring signal** that isn't a standard job-board listing — the AI
output is reconciled against this rule in `classify.ts`.

### Trust & safety

- Duplicate detection via content hash (`company|role|location`).
- Scam heuristics ("registration fee", "pay to apply", …) → `scam_score`.
- Source URL + `confidence_score` surfaced on every job.
- User-submitted and low-confidence items are routed to `pending` for admin review.
- The UI never claims a job/referral is legitimate without evidence, and never
  asks a user to pay for a referral.

---

## Ingestion & automation

Ingestion is **adapter-based** and intentionally does **not** assume LinkedIn
scraping. Sources plug in behind one interface (`src/lib/ingestion/adapters.ts`):
company career pages, public feeds, X/public hiring signals, user submissions,
and approved API providers.

Two entry points:

1. **User-submitted** — `POST /api/ingest` (authenticated). Accepts a URL and/or
   pasted text. Best-effort fetches public page text; otherwise the user pastes it.
2. **Machine-to-machine** — `POST /api/webhooks/ingest` (secret-gated via
   `x-ingest-secret`). Accepts a batch of `{ rawText, sourceUrl, sourceKind }`.

`automation/n8n-scheduled-ingestion.json` is an importable n8n workflow: a
15-minute schedule → fetch an approved feed → map to ingest items → POST to the
webhook. Set `PRINCIPLE_APP_URL` and `INGEST_WEBHOOK_SECRET` in n8n.

---

## Database schema

Defined in `supabase/migrations/0001_init.sql`:

`users` · `candidate_profiles` · `resumes` · `companies` · `job_sources` ·
`hiring_posts` · `jobs` · `referral_opportunities` · `applications` ·
`saved_jobs` · `referral_requests` · `notifications` · `events`

Foreign keys, indexes, and `created_at`/`updated_at` (with triggers) are defined
throughout. RLS restricts user-scoped tables to their owner; the public job
catalog is readable by authenticated users and written by server code using the
service-role key. A trigger auto-creates a `public.users` row on signup.

---

## Roadmap (Phases 2–5)

The schema, ingestion layer, and automation hooks for later phases already exist.

### Phase 2 — Ingestion & notifications

- Register scheduled adapters (career pages, public feeds, approved providers).
- Surface `hidden_job_score` filters and freshness ranking in the UI (done in Phase 1 baseline).
- In-app + WhatsApp notifications on new high-match / hidden jobs (tables ready: `notifications`).

### Phase 3 — Referral engine

- Referral matching when "Get Referral" is clicked: identify company + role,
  search `referral_opportunities`, match against `roles_mentioned`, rank by
  company/role/freshness/intent/seniority.
- AI referral message generation (never fabricating achievements), with
  **Edit / Send** and mandatory explicit approval before sending.
- `referral_requests` table already models drafts → approved → sent → responded.

### Phase 4 — Gmail & sending

- Gmail OAuth with the **narrowest send-only scope** (`gmail.send`); never read inbox.
- On approval: generate email, attach resume, send from the user's Gmail, record
  timestamp / recipient / job / referral, and update application status.

### Phase 5 — WhatsApp, analytics, admin

- Conversational WhatsApp layer (new job / referral cards) with approval before sending.
- Full admin workflow: approve/reject queues, duplicate and scam-flag review.
- Analytics on discovery → relevance → referral outcomes.

---

## Product principle

Principle AI optimizes for **early discovery + high relevance + trusted
referrals** — not the raw number of listings. Freshness, match quality, and
evidence-backed referrals are first-class everywhere in the product.
