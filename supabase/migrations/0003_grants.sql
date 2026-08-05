-- With "Automatically expose new tables" disabled (the secure default),
-- Supabase does not grant table privileges to the Data API roles on its own.
-- RLS policies from 0001_init.sql still govern which *rows* are visible —
-- these grants just allow the `authenticated` role to query the tables at
-- all. Anonymous (logged-out) users get no grants, so they see nothing.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
