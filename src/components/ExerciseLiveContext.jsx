import React, { useMemo } from "react";
import { ArrowUp, CheckCircle2, Dumbbell, Flame, Target, Trophy } from "lucide-react";
import { getLiveExerciseContext } from "../utils/liveExerciseContext";
import {
  getExercisePrescription,
  getRepRangeProgress,
} from "../utils/repRangeProgression";
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

const getRangeStatusContent = (progress) => {
  if (!progress) return null;

  if (progress.state === "ready_to_increase") {
    return {
      className: "exercise-range-status--ready",
      icon: <ArrowUp size={17} />,
      title: "Listo para subir peso",
      text: `Completaste ${progress.plannedSets}/${progress.plannedSets} series con ${progress.repMax}+ reps. La próxima sesión puedes aumentar la carga y volver cerca de ${progress.repMin} reps.`,
    };
  }

  if (progress.state === "below_range") {
    return {
      className: "exercise-range-status--below",
      icon: <Target size={17} />,
      title: "Recupera el rango",
      text: `Alguna serie quedó bajo ${progress.repMin} reps. Mantén la carga o ajústala hasta volver a ${progress.repMin}–${progress.repMax}.`,
    };
  }

  if (progress.state === "progressing") {
    return {
      className: "exercise-range-status--progressing",
      icon: <Target size={17} />,
      title: "Sigue sumando repeticiones",
      text: `Completaste todas tus series dentro del objetivo. Mantén el peso y busca llegar a ${progress.repMax} reps en todas.`,
    };
  }

  if (progress.state === "active") {
    return {
      className: "exercise-range-status--active",
      icon: <Target size={17} />,
      title: "Doble progresión en curso",
      text: progress.remainingSets
        ? `Te ${progress.remainingSets === 1 ? "queda" : "quedan"} ${progress.remainingSets} ${progress.remainingSets === 1 ? "serie" : "series"}. Mantén cada una entre ${progress.repMin} y ${progress.repMax} reps.`
        : `Mantén tus series entre ${progress.repMin} y ${progress.repMax} reps.`,
    };
  }

  return {
    className: "exercise-range-status--waiting",
    icon: <Target size={17} />,
    title: "Tu rango de progresión",
    text: `Objetivo: ${progress.plannedSets} ${progress.plannedSets === 1 ? "serie" : "series"} de ${progress.repMin}–${progress.repMax} reps. Primero sube repeticiones; después sube el peso.`,
  };
};

export default function ExerciseLiveContext({ exerciseName, sets = [] }) {
  const context = useMemo(
    () => getLiveExerciseContext(exerciseName, sets),
    [exerciseName, sets]
  );
  const prescription = useMemo(
    () => getExercisePrescription(exerciseName),
    [exerciseName]
  );
  const rangeProgress = useMemo(
    () => getRepRangeProgress(sets, prescription),
    [sets, prescription]
  );

  if (!context) return null;

  const status = getStatusContent(context);
  const rangeStatus = getRangeStatusContent(rangeProgress);
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

      <div className={`exercise-live-context__grid ${prescription ? "has-prescription" : ""}`}>
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

        {prescription && (
          <article className={rangeProgress?.state === "ready_to_increase" ? "is-range-ready" : "is-range"}>
            <Target size={15} />
            <span>Rango objetivo</span>
            <strong>{prescription.repMin}–{prescription.repMax} reps</strong>
            <small>{prescription.sets} {prescription.sets === 1 ? "serie" : "series"} · doble progresión</small>
          </article>
        )}
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

      {rangeStatus && (
        <div className={`exercise-range-status ${rangeStatus.className}`} role="status" aria-live="polite">
          <span className="exercise-range-status__icon">{rangeStatus.icon}</span>
          <div>
            <strong>{rangeStatus.title}</strong>
            <span>{rangeStatus.text}</span>
          </div>
        </div>
      )}
    </section>
  );
}
