-- Plan Owner + Collaborators: replaces flat org-wide plan access ("any
-- member of a school can see/edit every plan in it") with per-plan access
-- restricted to the plan's Owner, its Collaborators, and the school's
-- Admins (org_members.role = 'owner', kept in as a safety valve so an
-- admin is never locked out of a plan nobody shared with them).
--
-- owner_id is the mutable "who's responsible for this now" (changeable
-- from the Plan Details page); created_by (0001_init.sql) is untouched
-- and stays the immutable historical record of who actually created it.
alter table public.plans
  add column owner_id uuid references auth.users (id) on delete set null;

update public.plans set owner_id = created_by;

create table public.plan_collaborators (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

-- Backfill: every existing plan's current audience (every member of its
-- school) becomes an explicit collaborator, so nobody loses access to a
-- plan they can already see today. Only plans created after this migration
-- start with the smaller "just the owner" default.
insert into public.plan_collaborators (plan_id, user_id)
select p.id, om.user_id
from public.plans p
join public.org_members om on om.org_id = p.org_id
on conflict do nothing;

alter table public.plan_collaborators enable row level security;

-- Shared by every plan-scoped table's policies below instead of repeating
-- the same owner/collaborator/admin check on each one — same
-- security-definer pattern as current_user_org_ids()
-- (0026_fix_org_members_rls_recursion.sql).
create function public.can_access_plan(p_plan_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.plans p
    where p.id = p_plan_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1 from public.plan_collaborators pc
          where pc.plan_id = p.id and pc.user_id = auth.uid()
        )
        or exists (
          select 1 from public.org_members om
          where om.org_id = p.org_id and om.user_id = auth.uid() and om.role = 'owner'
        )
      )
  );
$$;

grant execute on function public.can_access_plan(uuid) to authenticated;

create policy "Plan members can view collaborators"
  on public.plan_collaborators for select
  using (public.can_access_plan(plan_id));

create policy "Plan members can add collaborators"
  on public.plan_collaborators for insert
  with check (public.can_access_plan(plan_id));

create policy "Plan members can remove collaborators"
  on public.plan_collaborators for delete
  using (public.can_access_plan(plan_id));

grant select, insert, delete on public.plan_collaborators to authenticated;

-- ---------------------------------------------------------------------------
-- plans — select/update/delete tightened to can_access_plan(); insert stays
-- "any org member" since the plan doesn't exist yet to check against.
-- ---------------------------------------------------------------------------
drop policy "Org members can view plans" on public.plans;
drop policy "Org members can update plans" on public.plans;
drop policy "Org members can delete plans" on public.plans;

create policy "Plan members can view plans"
  on public.plans for select
  using (public.can_access_plan(id));

create policy "Plan members can update plans"
  on public.plans for update
  using (public.can_access_plan(id));

create policy "Plan members can delete plans"
  on public.plans for delete
  using (public.can_access_plan(id));

-- ---------------------------------------------------------------------------
-- Every other table that stores plan content has its own independent RLS
-- keyed off org membership — tightening only `plans` above would leave
-- content readable/writable through these side doors.
-- ---------------------------------------------------------------------------
drop policy "Org members can view stage responses" on public.plan_stage_responses;
drop policy "Org members can upsert stage responses" on public.plan_stage_responses;
drop policy "Org members can update stage responses" on public.plan_stage_responses;

create policy "Plan members can view stage responses"
  on public.plan_stage_responses for select
  using (public.can_access_plan(plan_id));

create policy "Plan members can upsert stage responses"
  on public.plan_stage_responses for insert
  with check (public.can_access_plan(plan_id));

create policy "Plan members can update stage responses"
  on public.plan_stage_responses for update
  using (public.can_access_plan(plan_id));

drop policy "Org members can view checklist state" on public.plan_checklist_state;
drop policy "Org members can upsert checklist state" on public.plan_checklist_state;
drop policy "Org members can update checklist state" on public.plan_checklist_state;

create policy "Plan members can view checklist state"
  on public.plan_checklist_state for select
  using (public.can_access_plan(plan_id));

create policy "Plan members can upsert checklist state"
  on public.plan_checklist_state for insert
  with check (public.can_access_plan(plan_id));

create policy "Plan members can update checklist state"
  on public.plan_checklist_state for update
  using (public.can_access_plan(plan_id));

drop policy "Org members can view plan checklist items" on public.plan_checklist_items;
drop policy "Org members can insert plan checklist items" on public.plan_checklist_items;

create policy "Plan members can view plan checklist items"
  on public.plan_checklist_items for select
  using (public.can_access_plan(plan_id));

create policy "Plan members can insert plan checklist items"
  on public.plan_checklist_items for insert
  with check (public.can_access_plan(plan_id));

drop policy "Org members can view plan tags" on public.plan_tags;
drop policy "Org members can add plan tags" on public.plan_tags;
drop policy "Org members can remove plan tags" on public.plan_tags;

create policy "Plan members can view plan tags"
  on public.plan_tags for select
  using (public.can_access_plan(plan_id));

create policy "Plan members can add plan tags"
  on public.plan_tags for insert
  with check (public.can_access_plan(plan_id));

create policy "Plan members can remove plan tags"
  on public.plan_tags for delete
  using (public.can_access_plan(plan_id));

drop policy "Org members can view feedback" on public.feedback_comments;
drop policy "Org members can add feedback" on public.feedback_comments;
drop policy "Org members can resolve feedback" on public.feedback_comments;

create policy "Plan members can view feedback"
  on public.feedback_comments for select
  using (public.can_access_plan(plan_id));

create policy "Plan members can add feedback"
  on public.feedback_comments for insert
  with check (public.can_access_plan(plan_id));

create policy "Plan members can resolve feedback"
  on public.feedback_comments for update
  using (public.can_access_plan(plan_id));

-- knowledge_items (0031_knowledge_items.sql) is deliberately left
-- untouched — it was already designed to be a school-wide resource
-- readable by any org member regardless of which plan owns an item, not
-- plan-restricted, and that doesn't change here.
