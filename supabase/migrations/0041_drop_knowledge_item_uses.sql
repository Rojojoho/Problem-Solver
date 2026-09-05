-- Reverting the read-only "Use" reference mechanism (0039) before it ever
-- shipped to production: importing school knowledge into a plan should
-- make an independent copy (like the original "Use as variant" fork), not
-- a live reference — so a later edit or deletion of the source item
-- doesn't retroactively change or break what a plan already imported.
-- knowledge_plan_names() (0040) stays — it's still needed for "From:
-- <plan>" attribution in the shared-library browser regardless of this.
drop table if exists public.knowledge_item_uses;
