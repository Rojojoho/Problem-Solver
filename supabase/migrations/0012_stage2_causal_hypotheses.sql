-- Stage 2 (Inquire into Causes): fields 2.1 (plain text) and 2.2 (a
-- structured causal-hypotheses table, rendered client-side instead of a
-- text box — see stage-form.tsx). Also adds the admin-editable global
-- "Initial Validation" options used by that table.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0010_stage_field_templates.sql (stage_fields) and
-- 0004_admin.sql (admins).

insert into public.stage_fields
  (field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order)
values
  ('pc_meeting_plan', '2.1', 'PC', 'Meeting Plan',
    'Plan the meetings that will be required in order to inquire into causal hypotheses',
    null, 1),
  ('pc_causal_hypotheses', '2.2', 'PC', 'Causal Hypotheses',
    'Add Causal hypothesis gathered',
    'List all causal hypotheses gathered. Use the sentence stem "A possible cause of [the student outcome problem] is …"',
    2);

-- ---------------------------------------------------------------------------
-- validation_options — global, admin-editable statuses ("Possible",
-- "Parked", ...) selectable per causal hypothesis. Mirrors checklist_items'
-- shape: authenticated users can read, only admins can write.
-- ---------------------------------------------------------------------------
create table public.validation_options (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.validation_options enable row level security;

create policy "Authenticated users can view validation options"
  on public.validation_options for select
  to authenticated
  using (true);

create policy "Admins can create validation options"
  on public.validation_options for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update validation options"
  on public.validation_options for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete validation options"
  on public.validation_options for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.validation_options to authenticated;

insert into public.validation_options (label, sort_order) values
  ('Possible', 1),
  ('Parked', 2);
