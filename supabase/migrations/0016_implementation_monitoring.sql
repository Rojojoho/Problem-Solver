-- Stage 4 (Implement & Monitor): fields 4.1 (a structured table whose rows
-- mirror Stage 3B's solution strategies — see stage-form.tsx /
-- implementation-monitoring-table.tsx), 4.2 and 4.3 (plain text fields).
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0010_stage_field_templates.sql (stage_fields) and
-- 0013_configurable_stages.sql (stages).

insert into public.stage_fields
  (field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order)
values
  ('im_implementation_monitoring', '4.1', 'IM', 'Implement & Monitor',
    'Implement and monitor your solution strategies.',
    null, 1),
  ('im_reflections', '4.2', 'IM', 'Reflections',
    'What have you learnt about what works and what does not work in implementation? What might you need to do differently next term?',
    null, 2),
  ('im_next_term_plan', '4.3', 'IM', 'Next Term Plan',
    'Write your implementation plan for the following term.',
    null, 3);
