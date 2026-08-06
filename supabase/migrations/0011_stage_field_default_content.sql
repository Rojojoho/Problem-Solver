-- Per-field default content: pre-filled boilerplate shown in a field's
-- editor when no response has been saved yet. Admin-editable alongside the
-- other stage_fields display text (Short Name/Full Prompt/Helper Text).
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Depends on 0010_stage_field_templates.sql (stage_fields).

alter table public.stage_fields add column default_content jsonb;

update public.stage_fields
set default_content = '{
  "type": "doc",
  "content": [
    {"type":"paragraph","content":[{"type":"text","text":"1. State the purpose of the meeting as seeking agreement about the problem or challenge to be addressed"}]},
    {"type":"paragraph","content":[{"type":"text","text":"2. Present your own priority, supported by evidence and an educational argument (as outlined above)"}]},
    {"type":"paragraph","content":[{"type":"text","text":"3. Inquire for staff reaction to your suggested priority and inquire about any alternatives."}]},
    {"type":"paragraph","content":[{"type":"text","text":"4. Check for agreement about the priority."}]},
    {"type":"paragraph","content":[{"type":"text","text":"5. Signal the next steps in the process."}]}
  ]
}'::jsonb
where field_key = 'pi_agreement_script';
