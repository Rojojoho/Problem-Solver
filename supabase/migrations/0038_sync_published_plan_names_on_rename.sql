-- Renaming a plan didn't update the name shown for any of its published
-- submissions (including ones marked as an Exemplar) — published_plans.
-- snapshot_name is deliberately a frozen snapshot of everything else
-- (0005_publishing.sql: "doesn't shift under a reviewer mid-review"), but
-- the *name* is just a display label, not review content, and a school
-- renaming their own plan reasonably expects that label to follow.
--
-- One-time backfill: bring every existing snapshot's name in line with its
-- current source plan (a plan whose source_plan_id was already nulled out
-- by the plan being deleted is left alone — nothing to sync from).
update public.published_plans pp
set snapshot_name = p.name
from public.plans p
where pp.source_plan_id = p.id
  and pp.snapshot_name <> p.name;

-- Renaming a plan is now done through this function instead of a direct
-- `update plans` — it updates plans.name and syncs snapshot_name on every
-- published_plans row for that source plan in the same statement.
-- security definer because published_plans only grants UPDATE to admins
-- (0005_publishing.sql "Admins can review submissions") — a regular user
-- renaming their own plan has no other way to touch that table. Reuses
-- can_access_plan() (0037_plan_owner_and_collaborators.sql) for
-- authorization instead of introducing a separate check.
create function public.rename_plan(p_plan_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_access_plan(p_plan_id) then
    raise exception 'Not authorized to rename this plan.';
  end if;

  update public.plans
  set name = p_name, updated_at = now()
  where id = p_plan_id;

  update public.published_plans
  set snapshot_name = p_name, updated_at = now()
  where source_plan_id = p_plan_id;
end;
$$;

grant execute on function public.rename_plan(uuid, text) to authenticated;
