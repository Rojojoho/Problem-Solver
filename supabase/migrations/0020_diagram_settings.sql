-- Admin-configurable column headings for the 3.2 "Connections" traceability
-- diagram popup. Singleton table (one fixed row) since there's only ever
-- one set of headings for the whole app, not a per-item list like the other
-- admin settings tables.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0004_admin.sql (admins).

create table public.diagram_settings (
  id boolean primary key default true,
  problem_heading text not null default 'The problem to be solved is',
  causes_heading text not null default 'The agreed causes that contribute to this problem are',
  requirements_heading text not null default 'A solution will need to meet the following requirements',
  strategy_heading text not null default 'A solution strategy is',
  updated_at timestamptz not null default now(),
  constraint diagram_settings_singleton check (id)
);

insert into public.diagram_settings (id) values (true);

alter table public.diagram_settings enable row level security;

create policy "Authenticated users can view diagram settings"
  on public.diagram_settings for select
  to authenticated
  using (true);

create policy "Admins can update diagram settings"
  on public.diagram_settings for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, update on public.diagram_settings to authenticated;
