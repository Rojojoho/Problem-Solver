-- Publishing workflow: schools can publish a plan to a shared/central
-- database, an admin reviews it (pending -> approved/rejected), and admins
-- can tag approved-or-not submissions for later use (research, suggestions,
-- exemplar curation) independent of one another.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (ccps_stage, plans, organisations) and
-- 0004_admin.sql (admins).

create type public.published_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- published_plans (+ fields/checklist snapshots) — the master database.
-- Snapshot-based, not a live link into plans/plan_stage_responses, so a
-- publication survives the source plan/org being deleted later and doesn't
-- shift under a reviewer mid-review.
-- ---------------------------------------------------------------------------
create table public.published_plans (
  id uuid primary key default gen_random_uuid(),
  source_plan_id uuid references public.plans (id) on delete set null,
  source_org_id uuid references public.organisations (id) on delete set null,
  published_by uuid references auth.users (id) on delete set null,
  snapshot_name text not null,
  snapshot_current_stage public.ccps_stage not null,
  status public.published_status not null default 'pending',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.published_plan_fields (
  published_plan_id uuid not null references public.published_plans (id) on delete cascade,
  stage public.ccps_stage not null,
  field_key text not null,
  content jsonb not null default '{}'::jsonb,
  primary key (published_plan_id, stage, field_key)
);

-- Deliberately no FK to checklist_items(item_key) — this is a point-in-time
-- snapshot and must remain intact even if the checklist vocabulary changes.
create table public.published_plan_checklist_state (
  published_plan_id uuid not null references public.published_plans (id) on delete cascade,
  item_key text not null,
  checked boolean not null default false,
  primary key (published_plan_id, item_key)
);

alter table public.published_plans enable row level security;
alter table public.published_plan_fields enable row level security;
alter table public.published_plan_checklist_state enable row level security;

create policy "Publishers can submit plans"
  on public.published_plans for insert
  with check (published_by = auth.uid());

-- A submitter always sees their own submission regardless of status.
create policy "Publishers can view their own submissions"
  on public.published_plans for select
  using (published_by = auth.uid());

-- The "hidden until admin approval" mechanism, and the future anonymization
-- hook: a later migration can replace this policy (or front it with a view)
-- to also strip source_org_id/snapshot_name for non-admin readers, with zero
-- changes to the base tables or to how publishing/insert works.
create policy "Approved submissions are visible to authenticated users"
  on public.published_plans for select
  to authenticated
  using (status = 'approved');

create policy "Admins can view all submissions"
  on public.published_plans for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can review submissions"
  on public.published_plans for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Publishers can insert their submission fields"
  on public.published_plan_fields for insert
  with check (published_plan_id in (
    select id from public.published_plans where published_by = auth.uid()
  ));

create policy "Submission fields are visible where the submission is"
  on public.published_plan_fields for select
  using (published_plan_id in (
    select id from public.published_plans
    where published_by = auth.uid()
       or status = 'approved'
       or exists (select 1 from public.admins where user_id = auth.uid())
  ));

create policy "Publishers can insert their submission checklist state"
  on public.published_plan_checklist_state for insert
  with check (published_plan_id in (
    select id from public.published_plans where published_by = auth.uid()
  ));

create policy "Submission checklist state is visible where the submission is"
  on public.published_plan_checklist_state for select
  using (published_plan_id in (
    select id from public.published_plans
    where published_by = auth.uid()
       or status = 'approved'
       or exists (select 1 from public.admins where user_id = auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Tags — a managed vocabulary for categorizing published plans, independent
-- of exemplar promotion. Not every published plan becomes a featured
-- exemplar; many are just tagged raw data for later use.
-- ---------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.published_plan_tags (
  published_plan_id uuid not null references public.published_plans (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (published_plan_id, tag_id)
);

alter table public.tags enable row level security;
alter table public.published_plan_tags enable row level security;

create policy "Authenticated users can view tags"
  on public.tags for select
  to authenticated
  using (true);

create policy "Admins can create tags"
  on public.tags for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can rename tags"
  on public.tags for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete tags"
  on public.tags for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Submission tags are visible where the submission is"
  on public.published_plan_tags for select
  using (published_plan_id in (
    select id from public.published_plans
    where published_by = auth.uid()
       or status = 'approved'
       or exists (select 1 from public.admins where user_id = auth.uid())
  ));

create policy "Admins can tag published plans"
  on public.published_plan_tags for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can untag published plans"
  on public.published_plan_tags for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.published_plans to authenticated;
grant select, insert, update, delete on public.published_plan_fields to authenticated;
grant select, insert, update, delete on public.published_plan_checklist_state to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.published_plan_tags to authenticated;
