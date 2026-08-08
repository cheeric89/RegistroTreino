import React, { useMemo } from "react";
import { CheckCircle2, Dumbbell, Flame, Target, Trophy } from "lucide-react";
import { getLiveExerciseContext } from "../utils/liveExerciseContext";
import "./exercise-live-context.css";

const formatMark = (mark) => {
  if (!mark) return "—";
  const weight = Number(mark.weight) || 0;
  const reps = Number(mark.reps) || 0;

  if (weight > 0 && reps > 0) return `${weight.toLocaleString("es-CL")} kg × ${reps}`;
  if (weight > 0) return `${weight.toLocaleString("es-CL")} kg`;
  if (reps > 0) return `${reps} reps`;
  return "—";
};

const getStatusContent = (context) => {
  if (!context) return null;

  if (context.state === "new_pr") {
    return {
      className: "exercise-live-status--pr",
      icon: <Flame size={16} />,
      title: "¡Nuevo PR en vivo!",
      text: `${formatMark(context.currentBest)} supera tu mejor marca anterior.`,
    };
  }

  if (context.state === "target_reached") {
    return {
      className: "exercise-live-status--success",
      icon: <CheckCircle2 size={16} />,
      title: "Meta alcanzada",
      text: `${formatMark(context.currentBest)} cumple el objetivo sugerido para hoy.`,
    };
  }

  if (context.state === "first_mark") {
    return {
      className: "exercise-live-status--success",
      icon: <CheckCircle2 size={16} />,
      title: "Primera marca en curso",
      text: `${formatMark(context.currentBest)} será tu referencia cuando guardes la sesión.`,
    };
  }

  if (context.state === "active") {
    return {
      className: "exercise-live-status--active",
      icon: <Dumbbell size={16} />,
      title: "Serie comparada",
      text: context.target
        ? `Sigue buscando ${formatMark(context.target)}.`
        : "Sigue completando tus series.",
    };
  }

  return {
    className: "exercise-live-status--waiting",
    icon: <Dumbbell size={16} />,
    title: "Comparación en vivo",
    text: "Marca ✓ en una serie para compararla con tu historial.",
  };
};

export default function ExerciseLiveContext({ exerciseName, sets = [] }) {
  const context = useMemo(
    () => getLiveExerciseContext(exerciseName, sets),
    [exerciseName, sets]
  );

  if (!context) return null;

  const status = getStatusContent(context);
  const liveRecord = context.isLivePR ? context.currentBest : context.record;

  return (
    <section className="exercise-live-context" aria-label={`Contexto de ${exerciseName}`}>
      <header className="exercise-live-context__header">
        <div>
          <span>Contexto de hoy</span>
          <strong>Tu referencia mientras entrenas</strong>
        </div>
        <span className="exercise-live-context__live">EN VIVO</span>
      </header>

      <div className="exercise-live-context__grid">
        <article>
          <Dumbbell size={15} />
          <span>Última vez</span>
          <strong>{context.last ? formatMark(context.last) : "Primera vez"}</strong>
          <small>{context.last?.dateLabel || "Sin historial previo"}</small>
        </article>

        <article className={context.isLivePR ? "is-pr" : ""}>
          <Trophy size={15} />
          <span>{context.isLivePR ? "Nuevo PR" : "PR actual"}</span>
          <strong>{liveRecord ? formatMark(liveRecord) : "—"}</strong>
          <small>{context.isLivePR ? "Conseguido en esta sesión" : "Mejor marca histórica"}</small>
        </article>

        <article className={context.targetReached ? "is-target" : ""}>
          <Target size={15} />
          <span>Meta de hoy</span>
          <strong>{context.target ? formatMark(context.target) : "Crea tu marca"}</strong>
          <small>{context.target?.title || "Registra tu primera referencia"}</small>
        </article>
      </div>

      {status && (
        <div className={`exercise-live-status ${status.className}`} role="status" aria-live="polite">
          {status.icon}
          <div>
            <strong>{status.title}</strong>
            <span>{status.text}</span>
          </div>
        </div>
      )}
    </section>
  );
}
