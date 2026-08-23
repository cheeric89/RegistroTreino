alter table if exists public.profiles
  add column if not exists favorite_foods jsonb not null default '[]'::jsonb,
  add column if not exists recent_foods jsonb not null default '[]'::jsonb;
