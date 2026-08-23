-- The 3.2 "Connections" diagram is now viewable from a public share link
-- too, which needs its column headings — these are just cosmetic label
-- strings (no plan data, no user data), so it's safe to let anon read them
-- the same way authenticated users already can.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0020_diagram_settings.sql.
-- Safe to re-run: every statement below is idempotent.

drop policy if exists "Anyone can view diagram settings" on public.diagram_settings;
create policy "Anyone can view diagram settings"
  on public.diagram_settings for select
  to anon
  using (true);

grant select on public.diagram_settings to anon;
