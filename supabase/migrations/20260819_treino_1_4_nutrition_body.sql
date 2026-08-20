alter table if exists public.profiles
  add column if not exists birth_date date,
  add column if not exists energy_formula_sex text,
  add column if not exists calorie_target integer,
  add column if not exists protein_target_g numeric,
  add column if not exists carbs_target_g numeric,
  add column if not exists fat_target_g numeric,
  add column if not exists nutrition_tracking_enabled boolean not null default false;

create table if not exists public.body_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric,
  waist_cm numeric,
  chest_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  hip_cm numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.body_entries enable row level security;
alter table public.nutrition_entries enable row level security;

drop policy if exists "body_entries_select_own" on public.body_entries;
create policy "body_entries_select_own"
on public.body_entries for select
using (auth.uid() = user_id);

drop policy if exists "body_entries_insert_own" on public.body_entries;
create policy "body_entries_insert_own"
on public.body_entries for insert
with check (auth.uid() = user_id);

drop policy if exists "body_entries_update_own" on public.body_entries;
create policy "body_entries_update_own"
on public.body_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "body_entries_delete_own" on public.body_entries;
create policy "body_entries_delete_own"
on public.body_entries for delete
using (auth.uid() = user_id);

drop policy if exists "nutrition_entries_select_own" on public.nutrition_entries;
create policy "nutrition_entries_select_own"
on public.nutrition_entries for select
using (auth.uid() = user_id);

drop policy if exists "nutrition_entries_insert_own" on public.nutrition_entries;
create policy "nutrition_entries_insert_own"
on public.nutrition_entries for insert
with check (auth.uid() = user_id);

drop policy if exists "nutrition_entries_update_own" on public.nutrition_entries;
create policy "nutrition_entries_update_own"
on public.nutrition_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "nutrition_entries_delete_own" on public.nutrition_entries;
create policy "nutrition_entries_delete_own"
on public.nutrition_entries for delete
using (auth.uid() = user_id);

create index if not exists body_entries_user_date_idx
  on public.body_entries (user_id, entry_date desc);

create index if not exists nutrition_entries_user_date_idx
  on public.nutrition_entries (user_id, entry_date desc);
