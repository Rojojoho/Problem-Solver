-- Resolve (CCPS) — initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (mirrors auth.users, gives us a place to put a display name)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Organisations (e.g. a school). Auto-created for every new user on signup.
-- ---------------------------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create type public.org_role as enum ('owner', 'contributor');

create table public.org_members (
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

alter table public.organisations enable row level security;
alter table public.org_members enable row level security;

create policy "Members can view their org"
  on public.organisations for select
  using (id in (select org_id from public.org_members where user_id = auth.uid()));

create policy "Members can view their own membership rows"
  on public.org_members for select
  using (user_id = auth.uid());

-- Auto-create a profile + a personal organisation whenever a new auth user
-- signs up. The org name defaults to "<name>'s organisation" and can be
-- renamed later from org settings.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.organisations (name)
  values (display_name || '''s organisation')
  returning id into new_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
create type public.ccps_stage as enum ('PI', 'PC', 'SR', 'SS', 'EI');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null,
  created_by uuid not null references auth.users (id),
  current_stage public.ccps_stage not null default 'PI',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "Org members can view plans"
  on public.plans for select
  using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

create policy "Org members can create plans"
  on public.plans for insert
  with check (org_id in (select org_id from public.org_members where user_id = auth.uid()));

create policy "Org members can update plans"
  on public.plans for update
  using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

create policy "Org members can delete plans"
  on public.plans for delete
  using (org_id in (select org_id from public.org_members where user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Stage field responses — one row per (plan, stage, field).
-- Storing fields as rows (not fixed columns) means new fields/stages
-- don't require a schema migration.
-- ---------------------------------------------------------------------------
create table public.plan_stage_responses (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  stage public.ccps_stage not null,
  field_key text not null,
  content jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  unique (plan_id, stage, field_key)
);

alter table public.plan_stage_responses enable row level security;

create policy "Org members can view stage responses"
  on public.plan_stage_responses for select
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

create policy "Org members can upsert stage responses"
  on public.plan_stage_responses for insert
  with check (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

create policy "Org members can update stage responses"
  on public.plan_stage_responses for update
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

-- ---------------------------------------------------------------------------
-- Checklist — global definition of items per stage, plus per-plan checked state.
-- ---------------------------------------------------------------------------
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  stage public.ccps_stage not null,
  item_key text not null unique,
  label text not null,
  sort_order int not null default 0
);

create table public.plan_checklist_state (
  plan_id uuid not null references public.plans (id) on delete cascade,
  item_key text not null references public.checklist_items (item_key),
  checked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (plan_id, item_key)
);

alter table public.plan_checklist_state enable row level security;

create policy "Org members can view checklist state"
  on public.plan_checklist_state for select
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

create policy "Org members can upsert checklist state"
  on public.plan_checklist_state for insert
  with check (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

create policy "Org members can update checklist state"
  on public.plan_checklist_state for update
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

-- checklist_items has no RLS — it's shared reference data, readable by any
-- authenticated user.
alter table public.checklist_items enable row level security;

create policy "Authenticated users can view checklist items"
  on public.checklist_items for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Exemplars — worked examples users can reference per stage/field.
-- ---------------------------------------------------------------------------
create table public.exemplars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort_order int not null default 0
);

create table public.exemplar_fields (
  exemplar_id uuid not null references public.exemplars (id) on delete cascade,
  stage public.ccps_stage not null,
  field_key text not null,
  content jsonb not null default '{}'::jsonb,
  primary key (exemplar_id, stage, field_key)
);

alter table public.exemplars enable row level security;
alter table public.exemplar_fields enable row level security;

create policy "Authenticated users can view exemplars"
  on public.exemplars for select
  to authenticated
  using (true);

create policy "Authenticated users can view exemplar fields"
  on public.exemplar_fields for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Feedback — placeholder for reviewers to leave comments on a plan/stage.
-- ---------------------------------------------------------------------------
create table public.feedback_comments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  stage public.ccps_stage not null,
  author_id uuid not null references auth.users (id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback_comments enable row level security;

create policy "Org members can view feedback"
  on public.feedback_comments for select
  using (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

create policy "Org members can add feedback"
  on public.feedback_comments for insert
  with check (plan_id in (
    select id from public.plans where org_id in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  ));

-- ---------------------------------------------------------------------------
-- Seed: Stage 1 (Problem Identification) checklist items
-- ---------------------------------------------------------------------------
insert into public.checklist_items (stage, item_key, label, sort_order) values
  ('PI', 'pi_who', 'Specifies the students (who)', 1),
  ('PI', 'pi_what', 'Specifies the precise aspect of a learning area, a behaviour, or focus of wellbeing which is problematic (what)', 2),
  ('PI', 'pi_gap', 'Specifies the gap', 3),
  ('PI', 'pi_data_source', 'Specifies the data source(s)', 4);
