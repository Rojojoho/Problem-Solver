-- Tracks who last edited a Knowledge item, alongside the existing
-- created_by, so the Edit Knowledge dialog can show both "Created by" and
-- "Last edited by". Backfilled to created_by for existing rows (nobody has
-- edited them yet, so creator is the accurate last editor).
alter table public.knowledge_items
  add column updated_by uuid references auth.users (id) on delete set null;

update public.knowledge_items set updated_by = created_by;
