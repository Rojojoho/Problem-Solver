-- Multi-school readiness: lets a new user join an existing school (org) via
-- a short code instead of always getting a brand-new solo org, and gives
-- the app owner a CRM-style "Schools" admin page (contact/subscription/
-- billing/notes fields) for pre-provisioning and tracking schools.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (organisations, org_members) and 0004_admin.sql
-- (admins).
-- Safe to re-run: every statement below is idempotent.

-- ---------------------------------------------------------------------------
-- Join codes — how a user gets added to an existing org instead of always
-- landing in their own auto-created one.
-- ---------------------------------------------------------------------------
alter table public.organisations add column if not exists join_code text;

-- Backfill any existing orgs (and give new ones a default) with an 8-char
-- code. Collisions are astronomically unlikely at this scale; if one ever
-- happens the unique index below will simply reject the insert/update and
-- the app can retry with a freshly generated code.
update public.organisations
set join_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where join_code is null;

alter table public.organisations alter column join_code set not null;

drop index if exists organisations_join_code_key;
create unique index organisations_join_code_key on public.organisations (join_code);

-- ---------------------------------------------------------------------------
-- CRM fields — app-owner-only billing/contact/notes tracking per school.
-- Nullable: purely informational, no access enforcement (see guard trigger
-- below for why non-admins can't write these even though they share the
-- `organisations` row with the admin-managed name/join_code columns).
-- ---------------------------------------------------------------------------
alter table public.organisations add column if not exists primary_contact_name text;
alter table public.organisations add column if not exists primary_contact_email text;
alter table public.organisations add column if not exists accounts_email text;
alter table public.organisations add column if not exists admin_user_code text;
alter table public.organisations add column if not exists subscription_until date;
alter table public.organisations add column if not exists yearly_charge numeric;
alter table public.organisations add column if not exists sales_contact text;
alter table public.organisations add column if not exists notes text;

-- ---------------------------------------------------------------------------
-- organisations: admins can see/create/update every org; members can see
-- and rename their own org. Postgres RLS is row-level only, so a trigger
-- below stops a non-admin's update from smuggling in changes to the
-- CRM columns even though they're allowed to update the row for
-- name/join_code purposes.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can view all organisations" on public.organisations;
create policy "Admins can view all organisations"
  on public.organisations for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Admins can create organisations" on public.organisations;
create policy "Admins can create organisations"
  on public.organisations for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Org members can update their own org" on public.organisations;
create policy "Org members can update their own org"
  on public.organisations for update
  using (id in (select org_id from public.org_members where user_id = auth.uid()))
  with check (id in (select org_id from public.org_members where user_id = auth.uid()));

drop policy if exists "Admins can update any org" on public.organisations;
create policy "Admins can update any org"
  on public.organisations for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create or replace function public.guard_org_column_updates()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.admins where user_id = auth.uid()) then
    return new;
  end if;
  -- Non-admin org members may only rename their org or regenerate its join
  -- code — the CRM columns are yours alone to manage.
  new.primary_contact_name := old.primary_contact_name;
  new.primary_contact_email := old.primary_contact_email;
  new.accounts_email := old.accounts_email;
  new.admin_user_code := old.admin_user_code;
  new.subscription_until := old.subscription_until;
  new.yearly_charge := old.yearly_charge;
  new.sales_contact := old.sales_contact;
  new.notes := old.notes;
  return new;
end;
$$;

drop trigger if exists guard_org_column_updates on public.organisations;
create trigger guard_org_column_updates
  before update on public.organisations
  for each row execute procedure public.guard_org_column_updates();

grant select, insert, update on public.organisations to authenticated;

-- ---------------------------------------------------------------------------
-- org_members: members need to see their whole org's membership list (not
-- just their own row) for the members page; admins need to see/remove any
-- membership; org owners can remove members of their own org.
-- ---------------------------------------------------------------------------
drop policy if exists "Org members can view their org's membership list" on public.org_members;
create policy "Org members can view their org's membership list"
  on public.org_members for select
  using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

drop policy if exists "Admins can view all org memberships" on public.org_members;
create policy "Admins can view all org memberships"
  on public.org_members for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Org owners can remove members of their org" on public.org_members;
create policy "Org owners can remove members of their org"
  on public.org_members for delete
  using (
    org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists "Admins can remove any org membership" on public.org_members;
create policy "Admins can remove any org membership"
  on public.org_members for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, delete on public.org_members to authenticated;

-- ---------------------------------------------------------------------------
-- join_org_by_code — lets a signed-in user join an existing school by code.
-- security definer so it can insert into org_members (no general insert
-- policy exists on that table — every membership row is created either by
-- handle_new_user() or here) and clean up the user's now-empty
-- auto-created personal org, without needing broader RLS grants.
-- ---------------------------------------------------------------------------
create or replace function public.join_org_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_org record;
  v_old_org_id uuid;
  v_old_org_plan_count int;
  v_old_org_member_count int;
begin
  select id, name into v_target_org
  from public.organisations
  where join_code = upper(trim(p_code));

  if v_target_org.id is null then
    raise exception 'No school found for that code.';
  end if;

  if exists (
    select 1 from public.org_members
    where org_id = v_target_org.id and user_id = auth.uid()
  ) then
    return jsonb_build_object('orgId', v_target_org.id, 'orgName', v_target_org.name);
  end if;

  -- The org this user was auto-created into on signup (there should be
  -- exactly one, per handle_new_user()) — remove them from it, and delete
  -- it outright only if doing so won't destroy anyone's real work.
  select org_id into v_old_org_id
  from public.org_members
  where user_id = auth.uid()
  limit 1;

  insert into public.org_members (org_id, user_id, role)
  values (v_target_org.id, auth.uid(), 'contributor');

  if v_old_org_id is not null and v_old_org_id <> v_target_org.id then
    select count(*) into v_old_org_plan_count from public.plans where org_id = v_old_org_id;
    select count(*) into v_old_org_member_count from public.org_members where org_id = v_old_org_id;

    delete from public.org_members where org_id = v_old_org_id and user_id = auth.uid();

    if v_old_org_plan_count = 0 and v_old_org_member_count = 1 then
      delete from public.organisations where id = v_old_org_id;
    end if;
  end if;

  return jsonb_build_object('orgId', v_target_org.id, 'orgName', v_target_org.name);
end;
$$;

grant execute on function public.join_org_by_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- list_org_members — the members page needs each member's email/display
-- name, which live on auth.users/profiles (not directly selectable by
-- clients). security definer lets this read across that boundary, gated by
-- the same "caller is a member of this org, or an admin" check the
-- org_members select policies already encode.
-- ---------------------------------------------------------------------------
create or replace function public.list_org_members(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (
    exists (select 1 from public.org_members where org_id = p_org_id and user_id = auth.uid())
    or exists (select 1 from public.admins where user_id = auth.uid())
  ) then
    raise exception 'Not authorized to view this school''s members.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'userId', om.user_id,
        'role', om.role,
        'displayName', coalesce(p.full_name, split_part(u.email, '@', 1)),
        'email', u.email
      ) order by om.created_at
    )
    from public.org_members om
    join auth.users u on u.id = om.user_id
    left join public.profiles p on p.id = om.user_id
    where om.org_id = p_org_id
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.list_org_members(uuid) to authenticated;
