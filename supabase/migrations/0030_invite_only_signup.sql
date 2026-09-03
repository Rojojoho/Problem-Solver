-- Closes off self-service sign-up entirely: a Google sign-in only succeeds
-- if a school admin has already added that email as a pending invite.
-- handle_new_user() (0001_init.sql) is an AFTER INSERT trigger on
-- auth.users, so raising an exception inside it rolls back the whole
-- triggering transaction — including the auth.users row itself — meaning
-- an uninvited sign-in creates no account at all, not an orphaned one.
--
-- Existing accounts are completely unaffected: this trigger only ever
-- fires on a brand-new auth.users insert, never on a returning user's
-- sign-in, so nobody currently using the app is touched by this.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (organisations, org_members, handle_new_user),
-- 0025_school_crm_and_join_codes.sql (list_org_members),
-- 0026_fix_org_members_rls_recursion.sql (current_user_owned_org_ids).
-- Safe to re-run: idempotent.

-- ---------------------------------------------------------------------------
-- Every existing org member becomes an admin of their own school — nobody
-- loses access, and this matches the new mental model where "owner" is
-- displayed as "Admin" in the UI (see org-members-list.tsx).
-- ---------------------------------------------------------------------------
update public.org_members set role = 'owner';

-- ---------------------------------------------------------------------------
-- Optional short label from the invite form (the reference screenshot's
-- "Code" field), shown next to a member's name once they've signed up.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists nickname text;

-- ---------------------------------------------------------------------------
-- pending_invites — the allow-list. No email gets sent; a school admin
-- tells the invited person out-of-band to sign in with this exact email.
-- ---------------------------------------------------------------------------
create table if not exists public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  email text not null,
  full_name text,
  nickname text,
  role public.org_role not null default 'contributor',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- A plain (not functional) unique constraint, so the app's upsert-on-invite
-- can target it via `onConflict: "email"` — the app always lowercases
-- email before writing (see createInviteRecord), so this stays
-- case-insensitive in practice without needing a functional index here.
alter table public.pending_invites drop constraint if exists pending_invites_email_key;
alter table public.pending_invites add constraint pending_invites_email_key unique (email);

alter table public.pending_invites enable row level security;

drop policy if exists "Org owners can view their org's invites" on public.pending_invites;
create policy "Org owners can view their org's invites"
  on public.pending_invites for select
  using (org_id in (select public.current_user_owned_org_ids()));

drop policy if exists "Admins can view all invites" on public.pending_invites;
create policy "Admins can view all invites"
  on public.pending_invites for select
  using (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Org owners can create invites for their org" on public.pending_invites;
create policy "Org owners can create invites for their org"
  on public.pending_invites for insert
  with check (org_id in (select public.current_user_owned_org_ids()));

drop policy if exists "Admins can create invites for any org" on public.pending_invites;
create policy "Admins can create invites for any org"
  on public.pending_invites for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Org owners can update their org's invites" on public.pending_invites;
create policy "Org owners can update their org's invites"
  on public.pending_invites for update
  using (org_id in (select public.current_user_owned_org_ids()));

drop policy if exists "Admins can update any invite" on public.pending_invites;
create policy "Admins can update any invite"
  on public.pending_invites for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Org owners can delete their org's invites" on public.pending_invites;
create policy "Org owners can delete their org's invites"
  on public.pending_invites for delete
  using (org_id in (select public.current_user_owned_org_ids()));

drop policy if exists "Admins can delete any invite" on public.pending_invites;
create policy "Admins can delete any invite"
  on public.pending_invites for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.pending_invites to authenticated;

-- ---------------------------------------------------------------------------
-- handle_new_user() — now rejects any sign-up with no matching invite,
-- instead of unconditionally creating a personal organisation. Schools are
-- only ever created via the Admin > Schools "Add School" flow now.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite record;
begin
  select id, org_id, full_name, nickname, role
  into v_invite
  from public.pending_invites
  where lower(email) = lower(new.email)
  limit 1;

  if v_invite.id is null then
    raise exception 'not_invited';
  end if;

  insert into public.profiles (id, full_name, avatar_url, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', v_invite.full_name),
    new.raw_user_meta_data ->> 'avatar_url',
    v_invite.nickname
  );

  insert into public.org_members (org_id, user_id, role)
  values (v_invite.org_id, new.id, v_invite.role);

  delete from public.pending_invites where id = v_invite.id;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- list_org_members — now also returns each member's nickname.
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
        'email', u.email,
        'nickname', p.nickname
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
