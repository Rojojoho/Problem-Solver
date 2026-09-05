-- ---------------------------------------------------------------------------
-- Knowledge, part 2: school-level items + non-copying "Use" references.
--
-- 1. plan_id becomes nullable — null means the item belongs to the school
--    itself (created from School > Knowledge Base), not any one plan.
--    Safe: every RLS policy on knowledge_items (0031_knowledge_items.sql)
--    is keyed purely on org_id, with no plan_id involvement.
-- 2. knowledge_item_uses replaces "Use as variant" (which copied a shared
--    item into a brand-new row via forked_from_id, see
--    forkKnowledgeItemRecord). "Use" now just records that a plan
--    references another item, read-only, without touching that item's row.
-- 3. description moves from plain text to jsonb (Tiptap JSONContent), same
--    shape as plans.background / kb_articles.body, so the description field
--    can reuse TiptapEditor's existing Link toolbar button instead of
--    relying on auto-linkifying a raw pasted URL.
-- ---------------------------------------------------------------------------

alter table public.knowledge_items alter column plan_id drop not null;

create table public.knowledge_item_uses (
  plan_id uuid not null references public.plans (id) on delete cascade,
  knowledge_item_id uuid not null references public.knowledge_items (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (plan_id, knowledge_item_id)
);

alter table public.knowledge_item_uses enable row level security;

-- Reuses can_access_plan() (0037_plan_owner_and_collaborators.sql) so only
-- people with access to the *consuming* plan can add/remove its uses.
create policy "Plan members can view their knowledge uses"
  on public.knowledge_item_uses for select
  using (public.can_access_plan(plan_id));

create policy "Plan members can add knowledge uses"
  on public.knowledge_item_uses for insert
  with check (public.can_access_plan(plan_id));

create policy "Plan members can remove knowledge uses"
  on public.knowledge_item_uses for delete
  using (public.can_access_plan(plan_id));

grant select, insert, delete on public.knowledge_item_uses to authenticated;

create index knowledge_item_uses_item_idx on public.knowledge_item_uses (knowledge_item_id);

alter table public.knowledge_items alter column description drop default;

alter table public.knowledge_items
  alter column description type jsonb using (
    case
      when description is null or description = '' then
        jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph')))
      else
        jsonb_build_object(
          'type', 'doc',
          'content', jsonb_build_array(
            jsonb_build_object(
              'type', 'paragraph',
              'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', description))
            )
          )
        )
    end
  );

alter table public.knowledge_items
  alter column description set default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb;

alter table public.knowledge_items alter column description set not null;
