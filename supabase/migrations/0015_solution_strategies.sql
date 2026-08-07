-- Stage 3B (Solutions): field 3.2, a structured Solution Strategies table
-- (rendered client-side instead of a text box — see stage-form.tsx). Also
-- adds an admin-editable global "Status" option list used by that table.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0010_stage_field_templates.sql (stage_fields), 0004_admin.sql
-- (admins), and 0013_configurable_stages.sql (stages).

insert into public.stage_fields
  (field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order)
values
  ('ss_solution_strategies', '3.2', 'SS', 'Solution Strategies',
    'Identify possible solution strategies (initiatives) to meet your agreed solution requirements.',
    null, 1);

-- ---------------------------------------------------------------------------
-- solution_strategy_statuses — global, admin-editable "Status" options for
-- solution strategies. Mirrors validation_options' shape/RLS exactly.
-- ---------------------------------------------------------------------------
create table public.solution_strategy_statuses (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.solution_strategy_statuses enable row level security;

create policy "Authenticated users can view solution strategy statuses"
  on public.solution_strategy_statuses for select
  to authenticated
  using (true);

create policy "Admins can create solution strategy statuses"
  on public.solution_strategy_statuses for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update solution strategy statuses"
  on public.solution_strategy_statuses for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete solution strategy statuses"
  on public.solution_strategy_statuses for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.solution_strategy_statuses to authenticated;

insert into public.solution_strategy_statuses (label, sort_order) values
  ('Agreed', 1),
  ('Hold', 2);
