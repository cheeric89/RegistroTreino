create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('push', 'pull', 'legs')),
  name text not null,
  emoji text not null default '💪',
  description text not null default '',
  categories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type)
);

create index if not exists routines_user_id_idx on public.routines(user_id);

alter table public.routines enable row level security;

create policy "Users can view their own routines"
on public.routines for select
using (auth.uid() = user_id);

create policy "Users can insert their own routines"
on public.routines for insert
with check (auth.uid() = user_id);

create policy "Users can update their own routines"
on public.routines for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own routines"
on public.routines for delete
using (auth.uid() = user_id);

create or replace function public.set_routines_updated_at()
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

drop trigger if exists set_routines_updated_at on public.routines;
create trigger set_routines_updated_at
before update on public.routines
for each row execute function public.set_routines_updated_at();
