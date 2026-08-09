-- Treino Smart Platform
-- Amplía rutinas a cualquier estructura y prepara el perfil para objetivos/nutrición.

-- 1) Rutinas universales: mantenemos `type` como identificador estable, pero ya no
-- lo limitamos a push/pull/legs. Las rutinas existentes siguen siendo válidas.
alter table if exists public.routines
  drop constraint if exists routines_type_check;

-- 2) Perfil preparado para objetivos corporales y futura nutrición.
alter table if exists public.profiles
  add column if not exists training_goal text,
  add column if not exists target_weight_kg numeric,
  add column if not exists activity_level text,
  add column if not exists weekly_training_goal integer,
  add column if not exists nutrition_tracking_enabled boolean not null default false,
  add column if not exists muscle_targets jsonb not null default '{}'::jsonb;

comment on column public.profiles.training_goal is
  'Objetivo principal: muscle_gain, fat_loss, recomp, strength o maintain.';
comment on column public.profiles.target_weight_kg is
  'Peso corporal objetivo opcional.';
comment on column public.profiles.activity_level is
  'Nivel de actividad declarado por el usuario, preparado para futura nutrición.';
comment on column public.profiles.weekly_training_goal is
  'Cantidad objetivo de sesiones por semana.';
comment on column public.profiles.nutrition_tracking_enabled is
  'Reserva para habilitar el módulo de nutrición cuando se implemente.';
comment on column public.profiles.muscle_targets is
  'Metas semanales de series por grupo muscular.';
