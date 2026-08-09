import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Play, Save } from "lucide-react";
import { toast } from "sonner";
import { useRoutineContext } from "../contexts/RoutineContext";
import TreinoSelect from "./ui/TreinoSelect";

const DAYS = [
  { key: "monday", label: "Lunes", jsDay: 1 },
  { key: "tuesday", label: "Martes", jsDay: 2 },
  { key: "wednesday", label: "Miércoles", jsDay: 3 },
  { key: "thursday", label: "Jueves", jsDay: 4 },
  { key: "friday", label: "Viernes", jsDay: 5 },
  { key: "saturday", label: "Sábado", jsDay: 6 },
  { key: "sunday", label: "Domingo", jsDay: 0 },
];

const normalizePlan = (plan) => {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return {};
  return DAYS.reduce((result, day) => {
    const value = plan[day.key];
    result[day.key] = typeof value === "string" ? value : "";
    return result;
  }, {});
};

export const getTodayPlanKey = () => {
  const jsDay = new Date().getDay();
  return DAYS.find((day) => day.jsDay === jsDay)?.key || "monday";
};

export default function WeeklyPlanner({
  profile,
  saving = false,
  saveProfile,
  onStartRoutine,
}) {
  const { routines } = useRoutineContext();
  const [plan, setPlan] = useState(() => normalizePlan(profile?.weekly_plan));
  const [dirty, setDirty] = useState(false);
  const todayKey = getTodayPlanKey();

  useEffect(() => {
    setPlan(normalizePlan(profile?.weekly_plan));
    setDirty(false);
  }, [profile?.weekly_plan]);

  const routineOptions = useMemo(() => [
    { value: "", label: "Descanso", description: "Sin sesión programada" },
    ...routines.map((routine) => ({
      value: routine.type,
      label: `${routine.emoji || "💪"} ${routine.name || "Rutina"}`,
      description: routine.description || "Rutina guardada",
    })),
  ], [routines]);

  const todayRoutine = routines.find((routine) => routine.type === plan[todayKey]) || null;

  const updateDay = (dayKey, routineType) => {
    setPlan((current) => ({ ...current, [dayKey]: String(routineType || "") }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!saveProfile) return;
    const { error } = await saveProfile({ weekly_plan: normalizePlan(plan) });
    if (error) {
      toast.error("No se pudo sincronizar tu semana", {
        description: "Comprueba que ejecutaste la migración de Treino 1.3.",
      });
      return;
    }
    setDirty(false);
    toast.success("Plan semanal guardado");
  };

  return (
    <article className="weekly-planner-card">
      <header className="smart-card-heading weekly-planner-card__heading">
        <div>
          <span className="card-kicker">Coaching & Planning</span>
          <h2>Tu semana</h2>
          <p>Decide qué rutina toca cada día. Treino usará este plan como prioridad en “Hoy”.</p>
        </div>
        <CalendarDays size={20} />
      </header>

      <div className="weekly-planner-grid">
        {DAYS.map((day) => {
          const selectedRoutine = routines.find((routine) => routine.type === plan[day.key]);
          const isToday = day.key === todayKey;
          return (
            <div key={day.key} className={`weekly-planner-day ${isToday ? "is-today" : ""}`}>
              <div className="weekly-planner-day__label">
                <strong>{day.label}</strong>
                {isToday && <small>HOY</small>}
              </div>
              <TreinoSelect
                compact
                value={plan[day.key] || ""}
                options={routineOptions}
                onChange={(value) => updateDay(day.key, value)}
                ariaLabel={`Rutina del ${day.label}`}
              />
              <span className="weekly-planner-day__meta">
                {selectedRoutine?.description || "Recuperación / libre"}
              </span>
            </div>
          );
        })}
      </div>

      <footer className="weekly-planner-card__footer">
        <div className="weekly-planner-today">
          <span>Hoy</span>
          <strong>{todayRoutine ? `${todayRoutine.emoji || "💪"} ${todayRoutine.name}` : "Descanso / libre"}</strong>
        </div>
        <div className="weekly-planner-actions">
          {todayRoutine && (
            <button type="button" className="secondary-action-button" onClick={() => onStartRoutine?.(todayRoutine)}>
              <Play size={16} fill="currentColor" /> Empezar hoy
            </button>
          )}
          <button type="button" className="primary-action-button" onClick={handleSave} disabled={!dirty || saving}>
            <Save size={16} /> {saving ? "Guardando…" : dirty ? "Guardar semana" : "Semana guardada"}
          </button>
        </div>
      </footer>
    </article>
  );
}
