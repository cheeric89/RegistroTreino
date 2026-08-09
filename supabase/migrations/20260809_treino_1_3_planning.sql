-- Treino 1.3 — Coaching & Planning
-- El plan semanal vive en el perfil para sincronizarse entre dispositivos.

alter table if exists public.profiles
  add column if not exists weekly_plan jsonb not null default '{}'::jsonb;

comment on column public.profiles.weekly_plan is
  'Plan semanal de rutinas. Claves monday..sunday; valores routine.type o cadena vacía para descanso.';
