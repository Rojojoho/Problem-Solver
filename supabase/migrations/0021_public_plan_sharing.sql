-- Lets a plan owner generate a public, no-login link to a read-only view of
-- the whole plan (everything except the side panel) — a different concept
-- from the existing "Publish" feature (0005_publishing.sql), which snapshots
-- a plan into a review queue for other *logged-in* schools, never anonymous.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (plans, plan_stage_responses, stages),
-- 0009_plan_details.sql (background, plan_tags), 0010_stage_field_templates.sql
-- (stage_fields). Stage columns are plain `text` (0013_configurable_stages.sql
-- dropped the old ccps_stage enum in favour of admin-editable stages), so no
-- enum cast is needed anywhere below.
-- Safe to re-run: every statement below is idempotent.

alter table public.plans
  add column if not exists share_token uuid unique,
  add column if not exists share_enabled boolean not null default false;

-- Single security-definer function returning everything the public viewer
-- needs as one JSON blob. This is the ONLY thing granted to the `anon` role
-- — no table gets a new `select` grant for anon, so direct anonymous access
-- to `plans`/`plan_stage_responses`/etc. stays exactly as locked-down as it
-- is today. The function runs with the owner's privileges (bypassing RLS
-- internally) but only ever returns data for a plan matching a valid,
-- currently-enabled share token — an anonymous caller who doesn't have the
-- token can't use this to list or browse other plans.
create or replace function public.get_public_plan_bundle(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_plan record;
  v_result jsonb;
begin
  select id, name, background into v_plan
  from public.plans
  where share_token = p_token and share_enabled = true;

  if v_plan.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'id', v_plan.id,
    'name', v_plan.name,
    'background', coalesce(v_plan.background, '{}'::jsonb),
    'tags', coalesce((
      select jsonb_agg(tag order by tag)
      from public.plan_tags
      where plan_id = v_plan.id
    ), '[]'::jsonb),
    'stages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key', s.key,
          'label', s.label,
          'fields', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'field_key', sf.field_key,
                'internal_id', sf.internal_id,
                'full_prompt', sf.full_prompt,
                'helper_text', sf.helper_text,
                'default_content', sf.default_content,
                'sort_order', sf.sort_order
              ) order by sf.sort_order
            )
            from public.stage_fields sf
            where sf.stage = s.key
          ), '[]'::jsonb),
          'responses', coalesce((
            select jsonb_object_agg(psr.field_key, psr.content)
            from public.plan_stage_responses psr
            where psr.plan_id = v_plan.id and psr.stage = s.key
          ), '{}'::jsonb)
        ) order by s.sort_order
      )
      from public.stages s
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_public_plan_bundle(uuid) to anon;
