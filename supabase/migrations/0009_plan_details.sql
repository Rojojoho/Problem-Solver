-- Plan Details: a plan-level Background (rich text) field and free-text
-- Tags, independent of any single CCPS stage.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (plans, org_members).

alter table public.plans add column background jsonb;

-- Deliberately a separate table from tags/published_plan_tags (the
-- admin-curated vocabulary used for publishing) — these are simple,
-- free-text, per-plan tags any org member can add to their own plan.
create table public.plan_tags (
  plan_id uuid not null references public.plans (id) on delete cascade,
  tag text not null,
  primary key (plan_id, tag)
);

alter table public.plan_tags enable row level security;

create policy "Org members can view plan tags"
  on public.plan_tags for select
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

create policy "Org members can add plan tags"
  on public.plan_tags for insert
  with check (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

create policy "Org members can remove plan tags"
  on public.plan_tags for delete
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

grant select, insert, delete on public.plan_tags to authenticated;
