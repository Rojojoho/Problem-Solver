-- Configurable stages: replaces the fixed public.ccps_stage enum with a
-- data-driven, admin-editable reference table (same pattern as
-- checklist_items/stage_fields/validation_options), so stages can be
-- renamed/reordered/added from admin settings without a schema migration.
-- Also adds Stage 2B "Validated Causes" (key 'CV') with fields 2.3 and 2.4.
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0001_init.sql (ccps_stage, all stage-scoped tables),
-- 0004_admin.sql (admins), 0005_publishing.sql, 0006_knowledge_base.sql,
-- 0007_checklist_templates.sql, 0010_stage_field_templates.sql.

-- ---------------------------------------------------------------------------
-- 1. stages — global, admin-editable list of stage identities.
-- ---------------------------------------------------------------------------
create table public.stages (
  key text primary key,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.stages enable row level security;

create policy "Authenticated users can view stages"
  on public.stages for select
  to authenticated
  using (true);

create policy "Admins can create stages"
  on public.stages for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update stages"
  on public.stages for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update on public.stages to authenticated;

insert into public.stages (key, label, sort_order) values
  ('PI', '1 Improvement', 1),
  ('PC', '2A Causes', 2),
  ('CV', '2B Validated Causes', 3),
  ('SR', '3A Requirements', 4),
  ('SS', '3B Solutions', 5),
  ('IM', '4 Implement', 6),
  ('EI', '5 Impact', 7);

-- ---------------------------------------------------------------------------
-- 2. Convert every ccps_stage enum column to text referencing stages(key).
-- ---------------------------------------------------------------------------
alter table public.plans alter column current_stage drop default;
alter table public.plans alter column current_stage type text using current_stage::text;
alter table public.plans alter column current_stage set default 'PI';
alter table public.plans
  add constraint plans_current_stage_fkey foreign key (current_stage) references public.stages (key);

alter table public.plan_stage_responses alter column stage type text using stage::text;
alter table public.plan_stage_responses
  add constraint plan_stage_responses_stage_fkey foreign key (stage) references public.stages (key);

alter table public.checklist_items alter column stage type text using stage::text;
alter table public.checklist_items
  add constraint checklist_items_stage_fkey foreign key (stage) references public.stages (key);

alter table public.plan_checklist_items alter column stage type text using stage::text;
alter table public.plan_checklist_items
  add constraint plan_checklist_items_stage_fkey foreign key (stage) references public.stages (key);

alter table public.exemplar_fields alter column stage type text using stage::text;
alter table public.exemplar_fields
  add constraint exemplar_fields_stage_fkey foreign key (stage) references public.stages (key);

alter table public.feedback_comments alter column stage type text using stage::text;
alter table public.feedback_comments
  add constraint feedback_comments_stage_fkey foreign key (stage) references public.stages (key);

alter table public.published_plans alter column snapshot_current_stage type text using snapshot_current_stage::text;
alter table public.published_plans
  add constraint published_plans_snapshot_stage_fkey foreign key (snapshot_current_stage) references public.stages (key);

alter table public.published_plan_fields alter column stage type text using stage::text;
alter table public.published_plan_fields
  add constraint published_plan_fields_stage_fkey foreign key (stage) references public.stages (key);

alter table public.stage_fields alter column stage type text using stage::text;
alter table public.stage_fields
  add constraint stage_fields_stage_fkey foreign key (stage) references public.stages (key);

alter table public.kb_articles alter column stage type text using stage::text;
alter table public.kb_articles
  add constraint kb_articles_stage_fkey foreign key (stage) references public.stages (key);

drop type public.ccps_stage;

-- ---------------------------------------------------------------------------
-- 3. Stage 2B ("Validated Causes" / CV) fields.
-- ---------------------------------------------------------------------------
insert into public.stage_fields
  (field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order)
values
  ('cv_consolidated_hypotheses', '2.3', 'CV', 'Consolidated Hypotheses',
    'Consolidate and reduce your causal hypotheses to capture the main themes in your original list.',
    null, 1),
  ('cv_validated_causal_story', '2.4', 'CV', 'Validated Causal Story',
    'Use your validated causal hypotheses to write a causal story that explains your PI.',
    'The problem of…is explained by…and…and…', 2);
