-- Feedback comments can be marked resolved once addressed.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (feedback_comments, plans, org_members).

alter table public.feedback_comments
  add column resolved boolean not null default false,
  add column resolved_by uuid references auth.users (id) on delete set null,
  add column resolved_at timestamptz;

-- feedback_comments had select/insert policies only — add update so a
-- comment's resolved state can be toggled, scoped the same way as the
-- existing policies on this table.
create policy "Org members can resolve feedback"
  on public.feedback_comments for update
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));
