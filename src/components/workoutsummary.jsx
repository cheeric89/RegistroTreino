import { useMemo, useState } from "react";
import {
  BarChart2,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Home,
  RotateCcw,
  Share2,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkoutContext } from "../contexts/WorkoutContext";
import { getWorkoutGroup } from "../utils/workoutHistory";
import { shareWorkoutCard } from "../utils/shareWorkoutCard";

const normalizeName = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");

const getSetValues = (set = {}) => ({
  weight: Number(set?.weight) || 0,
  reps: Number(set?.reps) || 0,
});

const hasSetData = (set) => {
  const { weight, reps } = getSetValues(set);
  return weight > 0 || reps > 0;
};

const isBetterStrengthSet = (candidate, current) => {
  if (!candidate) return false;
  if (!current) return true;

  const a = getSetValues(candidate);
  const b = getSetValues(current);

  return (
    a.weight > b.weight ||
    (a.weight === b.weight && a.reps > b.reps) ||
    (a.weight === b.weight && a.reps === b.reps && a.weight * a.reps > b.weight * b.reps)
  );
};

const getBestStrengthSet = (sets = []) =>
  sets.filter(hasSetData).reduce(
    (best, set) => (isBetterStrengthSet(set, best) ? set : best),
    null
  );

const getBestVolumeSet = (sets = []) =>
  sets.filter(hasSetData).reduce((best, set) => {
    if (!best) return set;

    const current = getSetValues(set);
    const previous = getSetValues(best);
    const currentVolume = current.weight * current.reps;
    const previousVolume = previous.weight * previous.reps;

    if (currentVolume !== previousVolume) {
      return currentVolume > previousVolume ? set : best;
    }

    return isBetterStrengthSet(set, best) ? set : best;
  }, null);

const formatDuration = (seconds) => {
  const totalSeconds = Number(seconds) || 0;
  if (totalSeconds <= 0) return "—";

  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const formatNumber = (value) =>
  Math.round(Number(value) || 0).toLocaleString("es-CL");

const formatSet = (set) => {
  const { weight, reps } = getSetValues(set);
  if (weight > 0 && reps > 0) return `${reps}×${weight}kg`;
  if (reps > 0) return `${reps} reps`;
  if (weight > 0) return `${weight}kg`;
  return "No realizada";
};

export default function WorkoutSummary({ workout, onDone, onRepeat, onOpenHistory }) {
  const { workouts } = useWorkoutContext();
  const [sharing, setSharing] = useState(false);

  const summary = useMemo(() => {
    if (!workout) return null;

    const exerciseCategories = Array.isArray(workout.exercises) ? workout.exercises : [];
    const currentTimestamp = Number(workout.timestamp) || Date.now();
    const previousBestByExercise = new Map();

    workouts
      .filter((item) => {
        const timestamp = Number(item?.timestamp) || 0;
        return timestamp > 0 && timestamp < currentTimestamp;
      })
      .forEach((item) => {
        (item?.exercises || []).forEach((category) => {
          (category?.exercises || []).forEach((exercise) => {
            const name = exercise?.name?.trim();
            if (!name) return;
            const best = getBestStrengthSet(exercise?.sets || []);
            if (!best) return;
            const key = normalizeName(name);
            const existing = previousBestByExercise.get(key);
            if (!existing || isBetterStrengthSet(best, existing)) previousBestByExercise.set(key, best);
          });
        });
      });

    let totalSets = 0;
    let completedSets = 0;
    let totalExercises = 0;
    let calculatedVolume = 0;
    let prCount = 0;
    let firstReferenceCount = 0;
    let bestSessionSet = null;

    const categories = exerciseCategories.map((category) => {
      let categorySets = 0;
      let categoryCompleted = 0;
      let categoryVolume = 0;

      const exercises = (category?.exercises || []).map((exercise) => {
        totalExercises += 1;
        const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
        const doneSets = sets.filter((set) => set?.done).length;
        const validSets = sets.filter(hasSetData);
        const exerciseVolume = validSets.reduce((total, set) => {
          const { weight, reps } = getSetValues(set);
          return total + weight * reps;
        }, 0);

        totalSets += sets.length;
        completedSets += doneSets;
        categorySets += sets.length;
        categoryCompleted += doneSets;
        categoryVolume += exerciseVolume;
        calculatedVolume += exerciseVolume;

        const poolForBest = sets.some((set) => set?.done) ? sets.filter((set) => set?.done) : validSets;
        const currentBest = getBestStrengthSet(poolForBest);
        const currentBestVolume = getBestVolumeSet(poolForBest);

        if (currentBestVolume) {
          const candidate = { ...currentBestVolume, exerciseName: exercise?.name?.trim() || "Ejercicio" };
          if (!bestSessionSet) bestSessionSet = candidate;
          else {
            const candidateValues = getSetValues(candidate);
            const bestValues = getSetValues(bestSessionSet);
            const candidateVolume = candidateValues.weight * candidateValues.reps;
            const bestVolume = bestValues.weight * bestValues.reps;
            if (candidateVolume > bestVolume || (candidateVolume === bestVolume && isBetterStrengthSet(candidate, bestSessionSet))) {
              bestSessionSet = candidate;
            }
          }
        }

        const exerciseKey = normalizeName(exercise?.name || "");
        const previousBest = previousBestByExercise.get(exerciseKey);
        const isPR = Boolean(currentBest && previousBest && isBetterStrengthSet(currentBest, previousBest));
        const isFirstReference = Boolean(currentBest && !previousBest);
        if (isPR) prCount += 1;
        if (isFirstReference) firstReferenceCount += 1;

        return { ...exercise, sets, doneSets, exerciseVolume, isPR, isFirstReference };
      });

      return { ...category, exercises, categorySets, categoryCompleted, categoryVolume };
    });

    const storedVolume = Number(workout.volume);
    const totalVolume = Number.isFinite(storedVolume) && storedVolume > 0 ? storedVolume : calculatedVolume;
    const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    return {
      categories,
      totalSets,
      completedSets,
      totalExercises,
      totalMuscles: categories.length,
      totalVolume,
      completionRate,
      prCount,
      firstReferenceCount,
      bestSessionSet,
    };
  }, [workout, workouts]);

  if (!workout || !summary) return null;

  const bestSetValues = summary.bestSessionSet ? getSetValues(summary.bestSessionSet) : null;
  const prSupportingText = summary.prCount > 0
    ? `${summary.prCount === 1 ? "nuevo récord" : "nuevos récords"}`
    : summary.firstReferenceCount > 0
      ? `${summary.firstReferenceCount} ${summary.firstReferenceCount === 1 ? "primera marca" : "primeras marcas"}`
      : "sin PR nuevo";

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareWorkoutCard({ workout, summary });
      if (result.downloaded) toast.success("Tarjeta de Treino guardada como imagen");
    } catch (error) {
      if (error?.name !== "AbortError") toast.error("No se pudo compartir la tarjeta");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={`screen summary-screen summary-v2 flow-screen ${summary.prCount > 0 ? "summary-v2--has-pr" : ""}`}>
      {summary.prCount > 0 && (
        <div className="summary-pr-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
        </div>
      )}

      <div className="summary-v2__content">
        <header className="summary-v2__hero">
          <div className={`summary-v2__success-ring ${summary.prCount > 0 ? "is-pr" : ""}`} aria-hidden="true">
            {summary.prCount > 0 ? <Trophy size={42} /> : <CheckCircle2 size={42} />}
          </div>
          <span className="page-eyebrow">Entrenamiento guardado</span>
          <h1>{summary.prCount > 0 ? "¡Sesión de récord!" : "¡Sesión completada!"}</h1>
          <p className="summary-v2__date">{workout.day ?? "Entrenamiento"} · {workout.date ?? ""}</p>
          <p className="summary-v2__hero-copy">
            {summary.prCount > 0
              ? `Conseguiste ${summary.prCount} ${summary.prCount === 1 ? "nuevo PR" : "nuevos PRs"}. Tu historial ya quedó actualizado.`
              : "Tu sesión quedó registrada y ya forma parte de tu progreso."}
          </p>
        </header>

        {summary.prCount > 0 && (
          <section className="summary-pr-celebration" role="status">
            <Trophy size={21} />
            <div><strong>Nuevo nivel desbloqueado</strong><span>Las marcas de hoy ya son la referencia que Treino intentará superar la próxima vez.</span></div>
          </section>
        )}

        <section className="summary-v2__metrics" aria-label="Resumen del entrenamiento">
          <article className="summary-v2__metric-card"><span className="summary-v2__metric-icon"><Target size={18} /></span><strong>{summary.completedSets}</strong><span>Series</span><small>de {summary.totalSets} planificadas</small></article>
          <article className="summary-v2__metric-card"><span className="summary-v2__metric-icon"><Dumbbell size={18} /></span><strong>{summary.totalExercises}</strong><span>Ejercicios</span><small>{summary.totalMuscles} {summary.totalMuscles === 1 ? "músculo" : "músculos"}</small></article>
          <article className="summary-v2__metric-card"><span className="summary-v2__metric-icon"><BarChart2 size={18} /></span><strong>{summary.totalVolume > 0 ? formatNumber(summary.totalVolume) : "—"}</strong><span>Volumen</span><small>kg acumulados</small></article>
          <article className="summary-v2__metric-card"><span className="summary-v2__metric-icon"><Clock3 size={18} /></span><strong>{formatDuration(workout.duration)}</strong><span>Duración</span><small>tiempo entrenado</small></article>
        </section>

        <section className="summary-v2__highlights">
          <div className="summary-v2__section-heading"><div><span className="card-kicker">Resumen inteligente</span><h2>Lo mejor de hoy</h2></div><Sparkles size={20} /></div>
          <div className="summary-v2__highlight-grid">
            <article className="summary-v2__highlight-card summary-v2__highlight-card--pr"><Trophy size={19} /><strong>{summary.prCount}</strong><span>Récords personales</span><small>{prSupportingText}</small></article>
            <article className="summary-v2__highlight-card"><Dumbbell size={19} /><strong>{bestSetValues ? `${bestSetValues.reps} × ${bestSetValues.weight} kg` : "—"}</strong><span>Mejor serie</span><small>{summary.bestSessionSet?.exerciseName || "Sin datos suficientes"}</small></article>
            <article className="summary-v2__highlight-card"><Target size={19} /><strong>{summary.completionRate}%</strong><span>Cumplimiento</span><small>{summary.completedSets}/{summary.totalSets} series completadas</small></article>
          </div>
        </section>

        <section className="summary-share-card-preview">
          <div><span className="card-kicker">Comparte tu sesión</span><h2>Tu entrenamiento, en una tarjeta</h2><p>Treino genera una imagen 1080×1350 con duración, volumen, PRs y tu mejor serie. En móvil intenta abrir el menú nativo de compartir; en PC descarga el PNG.</p></div>
          <button type="button" className="primary-action-button" onClick={handleShare} disabled={sharing}><Share2 size={17} /> {sharing ? "Generando…" : "Compartir tarjeta"}</button>
        </section>

        <section className="summary-v2__training-card">
          <div className="summary-v2__section-heading summary-v2__section-heading--training"><div><span className="card-kicker">Detalle de la sesión</span><h2>{summary.totalExercises} ejercicio{summary.totalExercises !== 1 ? "s" : ""}</h2></div><BarChart2 size={20} /></div>
          {summary.categories.length === 0 && <p className="summary-empty-copy">No se registraron ejercicios.</p>}
          <div className="summary-v2__categories">
            {summary.categories.map((category, categoryIndex) => (
              <section key={`${category?.name}-${categoryIndex}`} className="summary-v2__category">
                <header className="summary-v2__category-header"><div><span className="cat-dot cat-dot--sm" /><strong>{category?.name ?? "Sin nombre"}</strong></div><span>{category.categoryCompleted}/{category.categorySets} series · {formatNumber(category.categoryVolume)} kg</span></header>
                <div className="summary-v2__exercise-list">
                  {(category?.exercises ?? []).map((exercise, exerciseIndex) => (
                    <article key={`${exercise?.name}-${exerciseIndex}`} className="summary-v2__exercise">
                      <div className="summary-v2__exercise-heading">
                        <div className="summary-v2__exercise-title"><strong>{exercise?.name ?? "Ejercicio"}</strong>{exercise.isPR && <span className="summary-v2__pr-badge">PR</span>}{!exercise.isPR && exercise.isFirstReference && <span className="summary-v2__first-badge">Nueva marca</span>}</div>
                        <span>{exercise.doneSets}/{exercise.sets.length} series</span>
                      </div>
                      <div className="summary-v2__set-list">
                        {exercise.sets.map((set, setIndex) => {
                          const hasData = hasSetData(set);
                          const stateClass = set?.done ? "summary-v2__set-chip--done" : hasData ? "summary-v2__set-chip--pending" : "summary-v2__set-chip--empty";
                          return <span key={`${setIndex}-${set?.weight}-${set?.reps}`} className={`summary-v2__set-chip ${stateClass}`} title={set?.done ? "Serie completada" : hasData ? "Serie sin confirmar" : "Serie no realizada"}>{formatSet(set)}</span>;
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="summary-v2__legend" aria-label="Leyenda de series"><span><i className="summary-v2__legend-dot summary-v2__legend-dot--done" /> Completada</span><span><i className="summary-v2__legend-dot summary-v2__legend-dot--pending" /> Sin confirmar</span><span><i className="summary-v2__legend-dot summary-v2__legend-dot--empty" /> No realizada</span></div>
        </section>

        <section className="summary-v2__actions">
          <div><span className="card-kicker">Siguiente paso</span><h2>¿Qué quieres hacer ahora?</h2></div>
          <div className="summary-v2__secondary-actions">
            {onRepeat && <button type="button" onClick={() => onRepeat(workout)}><RotateCcw size={17} /> Repetir sesión</button>}
            {onOpenHistory && <button type="button" onClick={() => onOpenHistory(getWorkoutGroup(workout))}><BarChart2 size={17} /> Ver historial</button>}
            <button type="button" onClick={handleShare} disabled={sharing}><Share2 size={17} /> Compartir</button>
          </div>
          <button type="button" className="cta-button" onClick={onDone}><Home size={18} /> Volver al inicio</button>
        </section>
      </div>
    </div>
  );
}
