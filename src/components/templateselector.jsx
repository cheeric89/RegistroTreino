import { ChevronLeft, ChevronRight, Pencil, Settings2 } from "lucide-react";
import { useRoutineContext } from "../contexts/RoutineContext";
import { countRoutineExercises, countRoutineSets } from "../utils/routines";

export default function TemplateSelector({ onSelect, onBack, onManageRoutines }) {
  const { routines, getRoutine, syncing } = useRoutineContext();
  const personalized = ["push", "pull", "legs"].map((type) => getRoutine(type));

  return (
    <div className="screen flow-screen">
      <div className="topbar">
        <button type="button" className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Nuevo entrenamiento</span>
          <h2>¿Qué entrenas hoy?</h2>
        </div>
      </div>

      <p className="screen-subtitle">
        Tus rutinas guardadas ya traen tus ejercicios y series. Treino añadirá tus marcas y metas al comenzar.
      </p>

      <div className="personal-routine-launch-list">
        {personalized.map((routine) => (
          <article key={routine.type} className={`personal-routine-launch personal-routine-launch--${routine.type}`}>
            <button type="button" className="personal-routine-launch__main" onClick={() => onSelect(routine)}>
              <span className="template-card__icon" aria-hidden="true">{routine.emoji || "💪"}</span>
              <span className="template-card__copy">
                <span className="day-label">{routine.name}</span>
                <span className="template-card__description">{routine.description}</span>
                <span className="personal-routine-launch__meta">
                  {countRoutineExercises(routine)} ejercicios · {countRoutineSets(routine)} series
                </span>
              </span>
              <ChevronRight size={18} className="day-arrow" />
            </button>
            <button type="button" className="personal-routine-launch__edit" onClick={() => onManageRoutines?.(routine.type)}>
              <Pencil size={15} />
              Editar
            </button>
          </article>
        ))}
      </div>

      <div className="template-free-divider"><span>o</span></div>

      <button
        type="button"
        className="day-card template-card template-card--free"
        onClick={() => onSelect({ id: "custom", type: "custom", name: "Entrenamiento libre", categories: null })}
      >
        <span className="template-card__icon" aria-hidden="true">⚙️</span>
        <span className="template-card__copy">
          <span className="day-label">Entrenamiento libre</span>
          <span className="template-card__description">Elige músculos y ejercicios para una sesión distinta.</span>
        </span>
        <ChevronRight size={17} className="day-arrow" />
      </button>

      <button type="button" className="manage-routines-link" onClick={() => onManageRoutines?.()}>
        <Settings2 size={16} />
        Gestionar mis rutinas
        {syncing && <small>Sincronizando…</small>}
      </button>
    </div>
  );
}
