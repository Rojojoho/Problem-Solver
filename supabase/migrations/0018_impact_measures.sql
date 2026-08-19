insert into public.stage_fields
  (field_key, internal_id, stage, short_name, full_prompt, helper_text, sort_order)
values
  ('ei_impact_measures', '5.1', 'EI', 'Impact Measures',
    'Track each measure against its target to evaluate impact.',
    null, 1);

-- impact_measure_types — global, admin-editable "Type" options for Stage 5
-- measures. Mirrors requirement_types' shape/RLS exactly.
create table public.impact_measure_types (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.impact_measure_types enable row level security;

create policy "Authenticated users can view impact measure types"
  on public.impact_measure_types for select to authenticated using (true);

create policy "Admins can create impact measure types"
  on public.impact_measure_types for insert
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can update impact measure types"
  on public.impact_measure_types for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "Admins can delete impact measure types"
  on public.impact_measure_types for delete
  using (exists (select 1 from public.admins where user_id = auth.uid()));

grant select, insert, update, delete on public.impact_measure_types to authenticated;

insert into public.impact_measure_types (label, sort_order) values
  ('Short term', 1),
  ('Long term', 2);
