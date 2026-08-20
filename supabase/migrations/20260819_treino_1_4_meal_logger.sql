alter table if exists public.nutrition_entries
  add column if not exists meals jsonb not null default '[]'::jsonb;

comment on column public.nutrition_entries.meals is
  'Comidas del día agrupadas por desayuno, almuerzo, once/snack y cena; cada item incluye porción y macros calculados.';
