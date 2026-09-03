-- Performance fix: switching stage tabs was firing ~6 separate HTTP
-- requests to Supabase (stage fields, responses, checklist items,
-- checklist state, exemplars — see getStageBundle in
-- web/src/app/(app)/plans/[id]/actions.ts). Timing instrumentation showed
-- these queueing behind each other in waves rather than truly running in
-- parallel, adding up to 1-3+ seconds per tab click. This bundles all five
-- into one round trip, the same consolidation pattern already used for the
-- public share view's get_public_plan_bundle (0021_public_plan_sharing.sql).
--
-- security invoker (the default — no `security definer` here) so this
-- runs with the calling user's own permissions: every table it reads still
-- goes through its existing RLS policies exactly as the five separate
-- queries did. No new access is granted by this function.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0010_stage_field_templates.sql (stage_fields),
-- 0007_checklist_templates.sql (plan_checklist_items),
-- 0024_stage_fields_hidden.sql (stage_fields.hidden), and
-- 0028_published_plan_exemplars.sql (published_plans.is_exemplar).
-- Safe to re-run: idempotent (create or replace).

create or replace function public.get_stage_bundle(p_plan_id uuid, p_stage text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'fields', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'field_key', sf.field_key,
          'internal_id', sf.internal_id,
          'short_name', sf.short_name,
          'full_prompt', sf.full_prompt,
          'helper_text', sf.helper_text,
          'default_content', sf.default_content,
          'sort_order', sf.sort_order,
          'hidden', sf.hidden
        ) order by sf.sort_order
      )
      from public.stage_fields sf
      where sf.stage = p_stage and sf.hidden = false
    ), '[]'::jsonb),
    'responses', coalesce((
      select jsonb_object_agg(psr.field_key, psr.content)
      from public.plan_stage_responses psr
      where psr.plan_id = p_plan_id and psr.stage = p_stage
    ), '{}'::jsonb),
    'checklistItems', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'item_key', pci.item_key,
          'label', pci.label,
          'sort_order', pci.sort_order
        ) order by pci.sort_order
      )
      from public.plan_checklist_items pci
      where pci.plan_id = p_plan_id and pci.stage = p_stage
    ), '[]'::jsonb),
    'checklistState', coalesce((
      select jsonb_object_agg(pcs.item_key, pcs.checked)
      from public.plan_checklist_state pcs
      where pcs.plan_id = p_plan_id
    ), '{}'::jsonb),
    'exemplars', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'name', pp.snapshot_name,
          'fields', coalesce((
            select jsonb_object_agg(ppf.field_key, ppf.content)
            from public.published_plan_fields ppf
            where ppf.published_plan_id = pp.id and ppf.stage = p_stage
          ), '{}'::jsonb)
        )
      )
      from public.published_plans pp
      where pp.is_exemplar = true and pp.status = 'approved'
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_stage_bundle(uuid, text) to authenticated;
