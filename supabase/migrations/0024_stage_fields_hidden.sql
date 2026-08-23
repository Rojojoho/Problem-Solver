-- Lets an admin hide a specific stage field from the live plan pages (and
-- the public share view) without deleting it — already-saved data under
-- that field_key is untouched, and it can be turned back on later.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0010_stage_field_templates.sql (stage_fields).
-- Safe to re-run: every statement below is idempotent.

alter table public.stage_fields add column if not exists hidden boolean not null default false;

-- Re-applies the public share bundle function with a hidden-field filter
-- added to its stage_fields subquery, plus each stage's sort_order (needed
-- client-side to interleave stages with the Plan Details/Summary tab
-- positions from 0023_workspace_tab_positions.sql). Everything else about
-- the function is unchanged from 0021_public_plan_sharing.sql.
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
          'sort_order', s.sort_order,
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
            where sf.stage = s.key and sf.hidden = false
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
