-- ---------------------------------------------------------------------------
-- knowledge_types — global, admin-editable "Type" options for Knowledge
-- items. Mirrors requirement_types' shape/RLS exactly
-- (0014_solution_requirements.sql).
-- ---------------------------------------------------------------------------
create table public.knowledge_types (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.knowledge_types enable row level security;

create policy "Authenticated users can view knowledge types"
  on public.knowledge_types for select
  to authenticated
  using (true);

create policy "Admins can insert knowledge types"
  on public.knowledge_types for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update knowledge types"
  on public.knowledge_types for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete knowledge types"
  on public.knowledge_types for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.knowledge_types to authenticated;

insert into public.knowledge_types (label, sort_order) values
  ('Terminology', 1),
  ('Evidence', 2),
  ('Policies', 3),
  ('Values', 4),
  ('Other', 5);

-- ---------------------------------------------------------------------------
-- knowledge_items — school-wide glossary/evidence entries. Owned by the plan
-- they were created in (plan_id), but org_id is denormalized from
-- plans.org_id so any org member can view/link/fork any item in their
-- school without a join through plans, and so a future dedicated
-- "School > Knowledge Base" page needs no schema change.
--
-- shared_to_school (default true) controls whether other plans can see this
-- item in their own "From school library" picker and table-cell link
-- pickers — it is never enforced as a visibility restriction against the
-- owning plan itself.
--
-- forked_from_id records the "variant" trail when this item was created via
-- "Use as variant" from another item (see forkKnowledgeItemRecord in
-- lib/db/index.ts) — `on delete set null` so deleting the source item never
-- blocks or cascades into items forked from it; a variant simply loses its
-- "adapted from" note and continues on as an independent item.
-- ---------------------------------------------------------------------------
create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  type_id uuid references public.knowledge_types (id) on delete set null,
  title text not null,
  description text not null default '',
  shared_to_school boolean not null default true,
  forked_from_id uuid references public.knowledge_items (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_items enable row level security;

-- Reuses current_user_org_ids() (0026_fix_org_members_rls_recursion.sql) —
-- the same recursion-safe helper already relied on for pending_invites —
-- rather than a fresh inline subquery against org_members.
create policy "Org members can view knowledge items"
  on public.knowledge_items for select
  using (org_id in (select public.current_user_org_ids()));

create policy "Org members can create knowledge items"
  on public.knowledge_items for insert
  with check (org_id in (select public.current_user_org_ids()));

create policy "Org members can update knowledge items"
  on public.knowledge_items for update
  using (org_id in (select public.current_user_org_ids()));

create policy "Org members can delete knowledge items"
  on public.knowledge_items for delete
  using (org_id in (select public.current_user_org_ids()));

grant select, insert, update, delete on public.knowledge_items to authenticated;

create index knowledge_items_plan_id_idx on public.knowledge_items (plan_id);
create index knowledge_items_org_id_shared_idx
  on public.knowledge_items (org_id) where shared_to_school;
