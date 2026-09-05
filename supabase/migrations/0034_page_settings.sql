-- Admin-configurable menu title / screen title / description for a fixed
-- set of school-facing sections (Knowledge Base, Guide, Users, School
-- settings) — managed from Admin > Global Settings > Pages. Site-wide, not
-- per-org: one shared row per section, same select-all-authenticated /
-- update-admin-only shape as diagram_settings (0020_diagram_settings.sql),
-- just with 4 named rows instead of 1 singleton.
create table public.page_settings (
  page_key text primary key,
  menu_title text not null,
  screen_title text not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.page_settings enable row level security;

create policy "Authenticated users can view page settings"
  on public.page_settings for select
  to authenticated
  using (true);

create policy "Admins can update page settings"
  on public.page_settings for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, update on public.page_settings to authenticated;

insert into public.page_settings (page_key, menu_title, screen_title, description) values
  ('knowledge_base', 'Knowledge', 'School Knowledge Base',
   'A central repository for key units of knowledge including definitions, beliefs and sources of evidence that are important to your school''s strategic problem solving processes'),
  ('guide', 'Guide', 'Best Practice Guide', ''),
  ('users', 'Users', 'Users', 'Manage the schools users and permissions'),
  ('school_settings', 'Settings', 'School Settings',
   'Configure key settings to align with your school''s processes');
