-- Stage input fields become an admin-editable template (stage_fields), with
-- each plan getting its own immutable snapshot (plan_stage_fields) taken at
-- creation time — mirrors 0007_checklist_templates.sql's exact approach, so
-- future admin edits never change what an already-created plan shows.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (ccps_stage, plans) and 0004_admin.sql (admins).

create table public.stage_fields (
  id uuid primary key default gen_random_uuid(),
  field_key text not null unique,
  internal_id text not null unique,
  stage public.ccps_stage not null,
  short_name text not null,
  full_prompt text not null,
  helper_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stage_fields enable row level security;

create policy "Authenticated users can view stage field templates"
  on public.stage_fields for select
  to authenticated
  using (true);

create policy "Admins can create stage field templates"
  on public.stage_fields for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update stage field templates"
  on public.stage_fields for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete stage field templates"
  on public.stage_fields for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.stage_fields to authenticated;

-- Seed with today's hardcoded PI_FIELDS (src/lib/ccps/constants.ts), so
-- existing behavior is preserved exactly once the app reads from here.
insert into public.stage_fields
  (field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order)
values
  ('pi_problem_description', '1.1', 'PI', 'Problem Description',
    'Describe the student outcome problem', 'Be as precise as you can.', 1),
  ('pi_outcome_data', '1.2', 'PI', 'Student Data',
    'Insert the student outcome data', 'The data that tells you that this is a problem.', 2),
  ('pi_educational_argument', '1.3', 'PI', 'Educational Argument',
    'Make an educational argument', 'Why is this problem the priority?', 3),
  ('pi_agreement_script', '1.4', 'PI', 'Agreement Script',
    'Describe/script what you might say to check for Stage 1 agreement', null, 4);

-- ---------------------------------------------------------------------------
-- plan_stage_fields — per-plan snapshot of the template.
-- ---------------------------------------------------------------------------
create table public.plan_stage_fields (
  plan_id uuid not null references public.plans (id) on delete cascade,
  field_key text not null,
  internal_id text not null,
  stage public.ccps_stage not null,
  short_name text not null,
  full_prompt text not null,
  helper_text text,
  sort_order int not null default 0,
  primary key (plan_id, field_key)
);

alter table public.plan_stage_fields enable row level security;

create policy "Org members can view plan stage fields"
  on public.plan_stage_fields for select
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

create policy "Org members can insert plan stage fields"
  on public.plan_stage_fields for insert
  with check (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

grant select, insert on public.plan_stage_fields to authenticated;

-- Backfill: existing plans keep exactly the fields they already have today.
insert into public.plan_stage_fields
  (plan_id, field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order)
select p.id, sf.field_key, sf.internal_id, sf.stage, sf.short_name, sf.full_prompt, sf.helper_text, sf.sort_order
from public.plans p
cross join public.stage_fields sf;
