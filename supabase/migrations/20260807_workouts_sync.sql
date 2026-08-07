-- Treino: sincronizacion de entrenamientos por usuario
-- Ejecutar en Supabase SQL Editor antes de probar la rama.

create extension if not exists pgcrypto;

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null default 'Entrenamiento',
  date text not null default '',
  timestamp bigint not null,
  duration integer not null default 0,
  volume numeric not null default 0,
  exercises jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workouts add column if not exists duration integer not null default 0;
alter table public.workouts add column if not exists volume numeric not null default 0;
alter table public.workouts add column if not exists exercises jsonb not null default '[]'::jsonb;
alter table public.workouts add column if not exists categories jsonb not null default '[]'::jsonb;
alter table public.workouts add column if not exists created_at timestamptz not null default now();
alter table public.workouts add column if not exists updated_at timestamptz not null default now();

-- Si hubo intentos anteriores de sincronizacion, elimina duplicados exactos
-- antes de crear la restriccion usada por UPSERT.
delete from public.workouts older
using public.workouts newer
where older.user_id = newer.user_id
  and older.timestamp = newer.timestamp
  and older.ctid < newer.ctid;

create unique index if not exists workouts_user_timestamp_uidx
  on public.workouts (user_id, timestamp);

create index if not exists workouts_user_timestamp_desc_idx
  on public.workouts (user_id, timestamp desc);

alter table public.workouts enable row level security;

-- Elimina nombres de politicas usados en versiones anteriores para evitar conflictos.
drop policy if exists "Users manage own workouts" on public.workouts;
drop policy if exists "Users can view own workouts" on public.workouts;
drop policy if exists "Users can insert own workouts" on public.workouts;
drop policy if exists "Users can update own workouts" on public.workouts;
drop policy if exists "Users can delete own workouts" on public.workouts;

create policy "Users can view own workouts"
  on public.workouts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own workouts"
  on public.workouts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own workouts"
  on public.workouts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on public.workouts
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.workouts to authenticated;

-- Mantiene updated_at correcto en cada modificacion.
create or replace function public.set_workouts_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
before update on public.workouts
for each row
execute function public.set_workouts_updated_at();
