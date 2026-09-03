-- Lets an admin mark an approved published-plan submission as a featured
-- exemplar, shown in the per-stage Exemplar dropdown to every user. This
-- replaces the old "Promote to exemplar" flow, which copied content into
-- the separate exemplars/exemplar_fields tables (0001_init.sql) — those
-- tables have no admin write RLS policy at all (that flow would already
-- error in production) and their reader (docToParagraphs) can't render
-- row-table fields. Reusing published_plans/published_plan_fields directly
-- avoids both problems: it's the same frozen-snapshot shape as
-- plan_stage_responses, already durable and already admin/public-readable.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0005_publishing.sql (published_plans).
-- Safe to re-run: idempotent.

alter table public.published_plans add column if not exists is_exemplar boolean not null default false;

-- No new RLS needed:
-- - "Admins can review submissions" (0005_publishing.sql) already lets
--   admins update any column on any submission, covering writes to
--   is_exemplar.
-- - "Approved submissions are visible to authenticated users" (status =
--   'approved') already lets any logged-in user read a marked exemplar's
--   published_plans/published_plan_fields rows once approved.
