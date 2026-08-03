-- Seed: Cabramatta / Julie Straub exemplar — Stage 1 (Problem Identification)
-- Content is stored as Tiptap JSON documents (matches plan_stage_responses.content).

with new_exemplar as (
  insert into public.exemplars (name, description, sort_order)
  values (
    'Cabramatta — Julie Straub (Reading)',
    'A worked example from Learn of Me (Cabramatta) tackling a Year 3-5 reading growth problem.',
    1
  )
  returning id
)
insert into public.exemplar_fields (exemplar_id, stage, field_key, content)
select id, 'PI', field_key, content::jsonb
from new_exemplar, (values
  ('pi_problem_description', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Year 4 and Year 5 Reading data indicates that up to 40% of students do not make expected growth or achieve PAT-R targets."}]},{"type":"paragraph","content":[{"type":"text","text":"Year 3 reading data indicates that 27% of students did not reach proficient bands in Reading (NAPLAN 2025)."}]}]}'),
  ('pi_outcome_data', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Year 3 PAT-R 2024: 33% of students did not make expected growth -> Year 4 PAT-R 2025: 42% did not make expected growth."}]},{"type":"paragraph","content":[{"type":"text","text":"Year 4 PAT-R 2024: 35% did not make expected growth -> Year 5 PAT-R 2025: 19% did not make expected growth."}]},{"type":"paragraph","content":[{"type":"text","text":"PAT Vocabulary Skills - Year 5: 35% of cohort below the mean. Year 4: 62.5% below the mean. Year 3: 55.5% below the mean."}]}]}'),
  ('pi_educational_argument', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Fisher, Frey, Hattie, and Thayre (2017) note that while primary school students are taught basic reading and writing skills, by middle school they must navigate complex, discipline-specific texts to build knowledge. Without strong foundational reading skills, students struggle to access content across subjects, widening learning gaps and limiting academic success."}]}]}'),
  ('pi_agreement_script', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"1. State the purpose of the meeting: \"The purpose of this meeting is to introduce you to a process where we will work together to review an identified problem of practice in the reading data for students in Years 3, 4, and 5.\""}]},{"type":"paragraph","content":[{"type":"text","text":"2. PI Advocacy: \"Based on our most recent PAT-R data, a significant number of students across Years 3, 4, and 5 are not demonstrating expected growth in reading.\""}]},{"type":"paragraph","content":[{"type":"text","text":"3. PI Inquiry: \"What do you believe this data tells us about our students’ current reading needs?\""}]},{"type":"paragraph","content":[{"type":"text","text":"4. Check for agreement: \"Do we agree that this is a priority problem in Year 3, Year 4 and Year 5?\""}]},{"type":"paragraph","content":[{"type":"text","text":"5. Signal next steps: \"We are going to find out if our hypothesis is correct, following some testing.\""}]}]}')
) as fields(field_key, content);
