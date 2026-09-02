-- Fixes another bug from 0025_school_crm_and_join_codes.sql: that migration
-- made organisations.join_code NOT NULL but never gave it a default value,
-- and handle_new_user() (0001_init.sql) inserts a new personal org on every
-- signup WITHOUT specifying join_code. Since 0025 was applied, every new
-- signup's org insert violates the NOT NULL constraint inside that trigger,
-- the whole auth.users insert transaction rolls back, and Supabase reports
-- exactly this: "Database error saving new user" — blocking ALL new
-- signups, not just users joining a pre-provisioned school.
--
-- Fix: give the column a default so any insert that doesn't specify
-- join_code (the trigger, or anything else added later) still gets a valid
-- one automatically, same generation scheme as 0025's one-off backfill.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Safe to re-run: idempotent.

alter table public.organisations
  alter column join_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
