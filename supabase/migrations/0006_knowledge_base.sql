-- Knowledge base: admin-authored articles, shown on their own page and
-- contextually in the plan side panel per stage.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (ccps_stage) and 0004_admin.sql (admins).

create type public.kb_status as enum ('draft', 'published');

create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body jsonb not null default '{}'::jsonb,
  stage public.ccps_stage,
  status public.kb_status not null default 'draft',
  sort_order int not null default 0,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kb_articles enable row level security;

create policy "Authenticated users can view published articles"
  on public.kb_articles for select
  to authenticated
  using (status = 'published');

create policy "Admins can view all articles"
  on public.kb_articles for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can create articles"
  on public.kb_articles for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update articles"
  on public.kb_articles for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete articles"
  on public.kb_articles for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.kb_articles to authenticated;
