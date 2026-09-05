-- Adds "Full Name" and "Description" alongside the existing Tab name
-- (stages.label) for the consolidated Global Settings > Stages editor,
-- which now also covers the two synthetic Plan Details/Summary tabs —
-- previously hardcoded JSX strings with no backing label at all (see
-- 0023_workspace_tab_positions.sql's comment on why they're a separate
-- table from `stages`, not folded into it here either).
alter table public.stages
  add column full_name text not null default '',
  add column description text not null default '';

alter table public.workspace_tab_positions
  add column label text not null default '',
  add column full_name text not null default '',
  add column description text not null default '';

-- Seed exactly the content specified for Stage 1, field 1.3, and the two
-- synthetic tabs. Every other stage/field keeps its current text as its
-- "Tab name"/"Title" default (full_name/description left blank to be
-- filled in later via the new screen).
update public.stages set label = 'PI', full_name = 'Problem Identification' where key = 'PI';
update public.stage_fields set full_prompt = 'Make an educational argument for why this such a problem' where internal_id = '1.3';
update public.workspace_tab_positions set label = 'Details', full_name = 'Plan Details' where key = 'details';
update public.workspace_tab_positions set label = 'Summary', full_name = 'Plan Summary' where key = 'summary';

-- Re-applies the public share bundle function with the two new stages
-- columns added to its payload, so the public view can show a stage's
-- Full Name/Description too. Everything else unchanged from
-- 0024_stage_fields_hidden.sql.
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
          'full_name', s.full_name,
          'description', s.description,
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
