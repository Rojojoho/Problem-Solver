-- Lets an admin reorder the "Plan Details" and "Summary" tabs relative to
-- the 7 real content stages (e.g. move Summary to the end), without adding
-- them as rows to the `stages` table — several places (KB article tagging,
-- the admin Checklist/Stage-fields tab pickers, exportPlan, and the public
-- share bundle's SQL function) assume `stages` is exactly the 7 real
-- content stages, so a separate tiny position table avoids leaking these
-- two pseudo-tabs into all of those.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0004_admin.sql (admins).
-- Safe to re-run: every statement below is idempotent.

create table if not exists public.workspace_tab_positions (
  key text primary key check (key in ('details', 'summary')),
  sort_order int not null
);

-- Seeded before stage 1 (sort_order 1) so today's visual order — Plan
-- Details, Summary, then the stages — is preserved until an admin changes it.
insert into public.workspace_tab_positions (key, sort_order) values
  ('details', -2),
  ('summary', -1)
  on conflict (key) do nothing;

alter table public.workspace_tab_positions enable row level security;

-- Same reasoning as diagram_settings' public-read policy: this is just a
-- sort-order integer, no plan or user data, so it's safe to let anon read
-- it too (the public share view mirrors the same tab order).
drop policy if exists "Authenticated users can view workspace tab positions" on public.workspace_tab_positions;
create policy "Authenticated users can view workspace tab positions"
  on public.workspace_tab_positions for select
  to authenticated
  using (true);

drop policy if exists "Anyone can view workspace tab positions" on public.workspace_tab_positions;
create policy "Anyone can view workspace tab positions"
  on public.workspace_tab_positions for select
  to anon
  using (true);

drop policy if exists "Admins can update workspace tab positions" on public.workspace_tab_positions;
create policy "Admins can update workspace tab positions"
  on public.workspace_tab_positions for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select on public.workspace_tab_positions to anon;
grant select, update on public.workspace_tab_positions to authenticated;
