create table if not exists public.ai_generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists ai_generation_usage_user_idx
on public.ai_generation_usage(user_id, usage_date desc);

alter table public.ai_generation_usage enable row level security;

-- No client policies on purpose. Only the Edge Function, using the service role,
-- reads/writes this table. This keeps the server-side quota non-bypassable.
