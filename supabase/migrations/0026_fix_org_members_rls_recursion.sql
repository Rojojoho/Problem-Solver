-- Fixes a bug in 0025_school_crm_and_join_codes.sql: two of its new
-- policies on org_members query org_members from within a policy defined
-- ON org_members — Postgres detects this self-reference as infinite
-- recursion (error 42P17: "infinite recursion detected in policy for
-- relation org_members") and aborts the query entirely. Since
-- getCurrentOrg() queries org_members on every single page, this broke the
-- whole app immediately after 0025 was applied.
--
-- Fix: move the self-lookup into `security definer` helper functions
-- (same pattern already used safely elsewhere in this app — e.g.
-- get_public_plan_bundle, join_org_by_code — a security definer function's
-- internal queries bypass RLS entirely, so referencing org_members from
-- inside one doesn't re-trigger org_members' own policies) and have the
-- two broken policies call those instead of querying org_members inline.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Safe to re-run: every statement below is idempotent.

create or replace function public.current_user_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

grant execute on function public.current_user_org_ids() to authenticated;

create or replace function public.current_user_owned_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.org_members where user_id = auth.uid() and role = 'owner';
$$;

grant execute on function public.current_user_owned_org_ids() to authenticated;

drop policy if exists "Org members can view their org's membership list" on public.org_members;
create policy "Org members can view their org's membership list"
  on public.org_members for select
  using (org_id in (select public.current_user_org_ids()));

drop policy if exists "Org owners can remove members of their org" on public.org_members;
create policy "Org owners can remove members of their org"
  on public.org_members for delete
  using (org_id in (select public.current_user_owned_org_ids()));
