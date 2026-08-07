-- Stage 3A (Requirements): field 3.1, a structured Solution Requirements
-- table (rendered client-side instead of a text box — see stage-form.tsx).
-- Also adds two admin-editable global option lists used by that table:
-- "requirement_types" (Resource/Improvement/Learning) and "moscow_options"
-- (Must/Should/Could/Will not).
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0010_stage_field_templates.sql (stage_fields), 0004_admin.sql
-- (admins), and 0013_configurable_stages.sql (stages).

insert into public.stage_fields
  (field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order)
values
  ('sr_solution_requirements', '3.1', 'SR', 'Solution Requirements',
    'Solution requirements are an interacting set of conditions your solution strategies must satisfy.',
    null, 1);

-- ---------------------------------------------------------------------------
-- requirement_types — global, admin-editable "Type" options for solution
-- requirements. Mirrors validation_options' shape/RLS exactly.
-- ---------------------------------------------------------------------------
create table public.requirement_types (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.requirement_types enable row level security;

create policy "Authenticated users can view requirement types"
  on public.requirement_types for select
  to authenticated
  using (true);

create policy "Admins can create requirement types"
  on public.requirement_types for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update requirement types"
  on public.requirement_types for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete requirement types"
  on public.requirement_types for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.requirement_types to authenticated;

insert into public.requirement_types (label, sort_order) values
  ('Resource', 1),
  ('Improvement', 2),
  ('Learning', 3);

-- ---------------------------------------------------------------------------
-- moscow_options — global, admin-editable "A solution…" (MoSCoW) options.
-- Same shape/RLS as requirement_types/validation_options.
-- ---------------------------------------------------------------------------
create table public.moscow_options (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.moscow_options enable row level security;

create policy "Authenticated users can view moscow options"
  on public.moscow_options for select
  to authenticated
  using (true);

create policy "Admins can create moscow options"
  on public.moscow_options for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update moscow options"
  on public.moscow_options for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete moscow options"
  on public.moscow_options for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.moscow_options to authenticated;

insert into public.moscow_options (label, sort_order) values
  ('Must', 1),
  ('Should', 2),
  ('Could', 3),
  ('Will not', 4);
