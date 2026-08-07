import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  RotateCcw,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkoutContext } from "../contexts/WorkoutContext";
import {
  HISTORY_GROUPS,
  getBestExerciseMarks,
  getHistoryGroupMeta,
  getWorkoutVolume,
  groupWorkouts,
} from "../utils/workoutHistory";

const formatDuration = (seconds) => {
  const minutes = Math.max(0, Math.round((Number(seconds) || 0) / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const getCategories = (workout) => {
  if (Array.isArray(workout?.categories) && workout.categories.length) {
    return workout.categories;
  }
  return (workout?.exercises || []).map((category) => category?.name).filter(Boolean);
};

export default function HistoryPage({
  initialGroup = "push",
  onBack,
  onOpenWorkout,
  onRepeatWorkout,
}) {
  const { workouts, deleteWorkout } = useWorkoutContext();
  const [activeGroup, setActiveGroup] = useState(initialGroup);
  const [pendingDelete, setPendingDelete] = useState(null);

  const grouped = useMemo(() => groupWorkouts(workouts), [workouts]);
  const groupMeta = getHistoryGroupMeta(activeGroup);
  const groupSessions = grouped[activeGroup] || [];
  const bestMarks = useMemo(
    () => getBestExerciseMarks(groupSessions, 6),
    [groupSessions]
  );

  const visibleGroups = useMemo(() => {
    const base = [...HISTORY_GROUPS];
    if (grouped.other.length > 0) base.push(getHistoryGroupMeta("other"));
    return base;
  }, [grouped.other.length]);

  const totalVolume = useMemo(
    () => groupSessions.reduce((total, workout) => total + getWorkoutVolume(workout), 0),
    [groupSessions]
  );

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const result = await deleteWorkout(pendingDelete.timestamp);
    setPendingDelete(null);

    if (result.error) {
      toast.warning("Sesión eliminada de este dispositivo", {
        description: "El borrado remoto quedó pendiente y se reintentará al reconectar.",
      });
      return;
    }

    toast.success("Sesión eliminada en todos tus dispositivos");
  };

  return (
    <div className="page-shell history-page">
      <header className="history-heading">
        <button type="button" className="history-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Inicio</span>
        </button>

        <div className="history-heading__copy">
          <span className="page-eyebrow">Historial por rutina</span>
          <h1>Push / Pull / Legs</h1>
          <p>
            Revisa tus sesiones anteriores y usa tus mejores marcas como referencia para la próxima vez.
          </p>
        </div>
      </header>

      <div className="history-group-tabs" role="tablist" aria-label="Tipos de entrenamiento">
        {visibleGroups.map((group) => {
          const count = grouped[group.id]?.length || 0;
          const active = activeGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`history-group-tab history-group-tab--${group.id} ${active ? "is-active" : ""}`}
              onClick={() => setActiveGroup(group.id)}
            >
              <span className="history-group-tab__label">{group.label}</span>
              <span className="history-group-tab__subtitle">{group.subtitle}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      <section className={`history-summary-card history-summary-card--${activeGroup}`}>
        <div>
          <span className="card-kicker">{groupMeta.label}</span>
          <h2>{groupMeta.subtitle}</h2>
          <p>
            {groupSessions.length > 0
              ? `${groupSessions.length} ${groupSessions.length === 1 ? "sesión registrada" : "sesiones registradas"}`
              : "Todavía no hay sesiones de este tipo."}
          </p>
        </div>

        <div className="history-summary-card__metrics">
          <div>
            <CalendarDays size={17} />
            <strong>{groupSessions.length}</strong>
            <span>sesiones</span>
          </div>
          <div>
            <Dumbbell size={17} />
            <strong>{Math.round(totalVolume).toLocaleString("es-CL")}</strong>
            <span>kg de volumen</span>
          </div>
        </div>
      </section>

      <div className="history-content-grid">
        <section className="history-marks-panel">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="card-kicker">Referencia</span>
              <h2>Mejores marcas</h2>
            </div>
            <Trophy size={20} />
          </div>

          {bestMarks.length > 0 ? (
            <div className="history-marks-list">
              {bestMarks.map((mark, index) => (
                <div key={`${mark.name}-${index}`} className="history-mark-row">
                  <span className="history-mark-row__rank">{String(index + 1).padStart(2, "0")}</span>
                  <div className="history-mark-row__copy">
                    <strong>{mark.name}</strong>
                    <span>{mark.category}</span>
                  </div>
                  <div className="history-mark-row__value">
                    <strong>{mark.weight || 0} kg</strong>
                    <span>× {mark.reps || 0} reps</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="history-empty-panel">
              <Trophy size={24} />
              <strong>Sin marcas todavía</strong>
              <p>Completa una sesión de {groupMeta.label} para empezar a construir tus referencias.</p>
            </div>
          )}
        </section>

        <section className="history-sessions-panel">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="card-kicker">Historial</span>
              <h2>Sesiones de {groupMeta.label}</h2>
            </div>
            <CalendarDays size={20} />
          </div>

          {groupSessions.length > 0 ? (
            <div className="history-session-list">
              {groupSessions.map((workout, index) => {
                const categories = getCategories(workout);
                return (
                  <article
                    key={workout.timestamp || `${workout.day}-${index}`}
                    className="history-session-card"
                  >
                    <button
                      type="button"
                      className="history-session-card__main"
                      onClick={() => onOpenWorkout?.(workout)}
                    >
                      <div className="history-session-card__topline">
                        <div>
                          <span>{workout.date || "Sin fecha"}</span>
                          <strong>{workout.day || "Entrenamiento"}</strong>
                        </div>
                        <ChevronRight size={18} />
                      </div>

                      <div className="history-session-card__categories">
                        {categories.slice(0, 4).map((category) => (
                          <span key={category}>{category}</span>
                        ))}
                      </div>

                      <div className="history-session-card__stats">
                        <span>
                          <Clock3 size={14} />
                          {formatDuration(workout.duration)}
                        </span>
                        <span>
                          <Dumbbell size={14} />
                          {Math.round(getWorkoutVolume(workout)).toLocaleString("es-CL")} kg
                        </span>
                      </div>
                    </button>

                    <div className="history-session-card__actions">
                      <button
                        type="button"
                        onClick={() => onRepeatWorkout?.(workout)}
                        aria-label="Repetir entrenamiento"
                      >
                        <RotateCcw size={15} />
                        Repetir
                      </button>
                      <button
                        type="button"
                        className="history-session-card__delete"
                        onClick={() => setPendingDelete(workout)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="history-empty-panel history-empty-panel--large">
              <Dumbbell size={27} />
              <strong>Aún no hay sesiones de {groupMeta.label}</strong>
              <p>Cuando completes una rutina de este grupo aparecerá automáticamente aquí.</p>
            </div>
          )}
        </section>
      </div>

      {pendingDelete && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setPendingDelete(null)}>
          <div
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirmation-dialog__icon confirmation-dialog__icon--danger">
              <Trash2 size={22} />
            </div>
            <h2 id="history-delete-title">¿Eliminar esta sesión?</h2>
            <p>
              Se eliminará “{pendingDelete.day || "Entrenamiento"}” del {pendingDelete.date || "historial"}.
              Esta acción no se puede deshacer.
            </p>
            <div className="confirmation-dialog__actions">
              <button type="button" className="dialog-button" onClick={() => setPendingDelete(null)}>
                Cancelar
              </button>
              <button type="button" className="dialog-button dialog-button--danger" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
