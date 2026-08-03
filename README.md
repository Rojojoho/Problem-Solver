# Complex Problem Solver (CCPS)

An online tool that steps a school (or any organisation) through the 5-stage
Collaborative Complex Problem Solving (CCPS) process:

1. Problem Identification
2. Inquire into Causes
3. Solution Requirements
4. Solution Strategies
5. Evaluate Impact

Only **Stage 1: Problem Identification** is built out so far; the other four
stages are placeholders with the same tab/side-panel structure ready to be
filled in next.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- shadcn/ui (Base UI primitives)
- Tiptap for rich text fields
- Supabase (Postgres + Auth, Google OAuth)

## Setup

### 1. Create a Supabase project

- Create a new project at [supabase.com](https://supabase.com).
- In the SQL Editor, run `supabase/migrations/0001_init.sql`, then
  `supabase/migrations/0002_seed_exemplars.sql`.
- Under **Authentication → Providers**, enable **Google** and add your OAuth
  client ID/secret. Add `http://localhost:3000/auth/callback` (and your
  production URL once deployed) as an authorized redirect URI in the Google
  Cloud console and in Supabase's provider settings.

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your project's URL and
anon key (Project Settings → API):

```bash
cp .env.local.example .env.local
```

### 3. Run locally

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected
to `/login`.

## Deploying

- Push this repo to GitHub, then import it in Vercel.
- Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
- Add the deployed URL's `/auth/callback` as an authorized redirect URI in
  both Google Cloud console and Supabase.

## Data model

See `supabase/migrations/0001_init.sql`. Key tables:

- `organisations` / `org_members` — every user is auto-enrolled into their
  own organisation on signup (trigger on `auth.users`); multi-user
  collaboration within an org is supported by the schema already.
- `plans` — a problem-solving plan, scoped to an org.
- `plan_stage_responses` — one row per (plan, stage, field), storing Tiptap
  JSON. New fields or stages don't require a schema migration.
- `checklist_items` / `plan_checklist_state` — the "does it meet the success
  criteria" checklist shown in the side panel, per stage.
- `exemplars` / `exemplar_fields` — worked examples selectable from the side
  panel's Exemplar tab.
- `feedback_comments` — placeholder comment thread per plan/stage.

Row-Level Security scopes everything to the user's organisation.
