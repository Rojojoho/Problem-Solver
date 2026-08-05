-- Admin foundation.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
--
-- Admin status is granted by inserting a row into `admins` directly via the
-- Supabase dashboard/SQL editor — there is deliberately NO insert/update/
-- delete policy for `authenticated` on this table, so nothing in the app
-- itself can ever grant admin to a user. This is the entire enforcement
-- mechanism; do not "fix" the missing write policy later without
-- understanding this is intentional.

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Lets a logged-in user check "am I an admin" for their own row only —
-- not list all admins.
create policy "Users can check their own admin status"
  on public.admins for select
  using (user_id = auth.uid());

grant select on public.admins to authenticated;
