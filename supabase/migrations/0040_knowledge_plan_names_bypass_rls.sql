-- Knowledge's "From: <plan>" attribution needs a plan's name regardless of
-- whether the viewer has access to that plan's own content. plans SELECT
-- RLS is now Owner/Collaborator/Admin only (0037_plan_owner_and_collaborators.sql),
-- but knowledge_items was deliberately kept school-wide (0031_knowledge_items.sql)
-- — so an embedded `plans(name)` join in a knowledge query silently drops
-- the *entire* knowledge_items row whenever the viewer can't read its
-- source plan (PostgREST/Postgres RLS applies to embedded to-one joins
-- too), which is why shared knowledge from other plans was disappearing
-- from the School Knowledge Base for anyone who wasn't that plan's
-- owner/collaborator/admin.
--
-- Fix: resolve plan names for knowledge attribution via a dedicated
-- security-definer function instead of an embedded join, scoped to the
-- caller's own org(s) via current_user_org_ids() (0026) so it can't leak
-- another org's plan names.
create or replace function public.knowledge_plan_names(p_ids uuid[])
returns table (id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name
  from public.plans p
  where p.id = any(p_ids)
    and p.org_id in (select public.current_user_org_ids());
$$;

grant execute on function public.knowledge_plan_names(uuid[]) to authenticated;
