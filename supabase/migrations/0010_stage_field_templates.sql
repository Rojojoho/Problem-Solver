-- Stage field labels: a small global reference table giving each of Stage
-- 1's existing hardcoded input fields a stable Internal ID plus an
-- admin-editable Short Name / Full Prompt / Helper Text. This is
-- deliberately NOT a per-plan snapshot — the set of fields and their
-- field_key values stay exactly as they are today (they must keep matching
-- plan_stage_responses/exemplar_fields), only the display text is editable.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (ccps_stage) and 0004_admin.sql (admins).

create table public.stage_fields (
  field_key text primary key,
  internal_id text not null unique,
  stage public.ccps_stage not null,
  short_name text not null,
  full_prompt text not null,
  helper_text text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.stage_fields enable row level security;

create policy "Authenticated users can view stage fields"
  on public.stage_fields for select
  to authenticated
  using (true);

create policy "Admins can update stage fields"
  on public.stage_fields for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, update on public.stage_fields to authenticated;

-- Seed with today's hardcoded PI_FIELDS (src/lib/ccps/constants.ts) — these
-- field_key values are exactly what's already used in plan_stage_responses
-- and exemplar_fields, and must not change.
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
