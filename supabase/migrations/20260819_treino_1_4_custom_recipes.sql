alter table if exists public.profiles
  add column if not exists custom_recipes jsonb not null default '[]'::jsonb;

comment on column public.profiles.custom_recipes is
  'Recetas/comidas personalizadas creadas por el usuario a partir de ingredientes y porciones.';
