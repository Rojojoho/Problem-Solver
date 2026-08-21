-- Lets a feedback comment be posted without a specific stage — used by the
-- Summary tab's side panel, which rolls up several stages rather than being
-- one itself. Mirrors kb_articles.stage's existing nullable "general" pattern.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (feedback_comments).

alter table public.feedback_comments alter column stage drop not null;
