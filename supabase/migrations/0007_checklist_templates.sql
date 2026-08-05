-- Checklist templates: the global checklist_items table becomes an
-- admin-editable template. Each plan gets its own immutable snapshot
-- (plan_checklist_items) taken at creation time, so future admin edits to
-- the template never change what an already-created plan shows.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (checklist_items, plan_checklist_state, plans)
-- and 0004_admin.sql (admins).

-- ---------------------------------------------------------------------------
-- 1. plan_checklist_items — per-plan snapshot of the template.
-- ---------------------------------------------------------------------------
create table public.plan_checklist_items (
  plan_id uuid not null references public.plans (id) on delete cascade,
  item_key text not null,
  stage public.ccps_stage not null,
  label text not null,
  sort_order int not null default 0,
  primary key (plan_id, item_key)
);

alter table public.plan_checklist_items enable row level security;

create policy "Org members can view plan checklist items"
  on public.plan_checklist_items for select
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

-- Needed because plan creation (and its snapshot insert) runs as the
-- logged-in user via the normal client, not a service role.
create policy "Org members can insert plan checklist items"
  on public.plan_checklist_items for insert
  with check (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

grant select, insert, update, delete on public.plan_checklist_items to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Backfill: give every existing plan the same item set it already
--    effectively has today (since today everything reads the one live
--    template). Must run before the FK swap below.
-- ---------------------------------------------------------------------------
insert into public.plan_checklist_items (plan_id, item_key, stage, label, sort_order)
select p.id, ci.item_key, ci.stage, ci.label, ci.sort_order
from public.plans p
cross join public.checklist_items ci;

-- ---------------------------------------------------------------------------
-- 3. Repoint plan_checklist_state's FK from the global template to the
--    plan-scoped snapshot. The old constraint's name is looked up
--    dynamically rather than guessed, since getting this wrong would leave
--    plan_checklist_state silently still requiring item_key to exist in the
--    global (mutable) table forever.
-- ---------------------------------------------------------------------------
do $$
declare
  old_constraint_name text;
begin
  select tc.constraint_name into old_constraint_name
  from information_schema.table_constraints tc
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name
   and tc.constraint_schema = ccu.constraint_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'plan_checklist_state'
    and tc.constraint_type = 'FOREIGN KEY'
    and ccu.table_name = 'checklist_items'
  limit 1;

  if old_constraint_name is not null then
    execute format(
      'alter table public.plan_checklist_state drop constraint %I',
      old_constraint_name
    );
  end if;
end $$;

alter table public.plan_checklist_state
  add constraint plan_checklist_state_plan_item_fkey
  foreign key (plan_id, item_key)
  references public.plan_checklist_items (plan_id, item_key);

-- ---------------------------------------------------------------------------
-- 4. Admin write access to the global template (previously nobody could
--    write to it via the app at all).
-- ---------------------------------------------------------------------------
create policy "Admins can create checklist template items"
  on public.checklist_items for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update checklist template items"
  on public.checklist_items for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete checklist template items"
  on public.checklist_items for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));
