import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Dumbbell,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRoutineContext } from "../../contexts/RoutineContext";
import { useWorkoutContext } from "../../contexts/WorkoutContext";
import { buildExerciseProgress } from "../../utils/exerciseProgress";
import { generateAIRoutinePlan } from "../../utils/aiRoutine";

const GOALS = [
  { id: "muscle_gain", label: "Ganar músculo", description: "Prioriza hipertrofia y progresión de cargas." },
  { id: "fat_loss", label: "Perder grasa", description: "Mantiene fuerza y masa muscular mientras defines." },
  { id: "recomposition", label: "Recomposición", description: "Ganar músculo mientras reduces grasa gradualmente." },
  { id: "strength", label: "Ganar fuerza", description: "Más énfasis en básicos y progresión de rendimiento." },
  { id: "maintain_weight_muscle", label: "Músculo manteniendo peso", description: "Progresar sin buscar grandes cambios de peso." },
];

const LEVELS = [
  { id: "beginner", label: "Principiante", description: "Menos de 1 año entrenando de forma constante." },
  { id: "intermediate", label: "Intermedio", description: "Ya dominas técnica y progresión básica." },
  { id: "advanced", label: "Avanzado", description: "Varios años de entrenamiento estructurado." },
];

const EQUIPMENT = [
  { id: "full_gym", label: "Gimnasio completo" },
  { id: "machines", label: "Máquinas" },
  { id: "barbell", label: "Barra y discos" },
  { id: "dumbbells", label: "Mancuernas" },
  { id: "cables", label: "Poleas" },
  { id: "bodyweight", label: "Peso corporal" },
];

const initialForm = {
  goal: "muscle_gain",
  experience: "intermediate",
  daysPerWeek: 6,
  sessionMinutes: 75,
  equipment: ["full_gym"],
  priorities: "",
  restrictions: "",
  keepFamiliarExercises: true,
};

const formatRoutineMeta = (routine) => {
  const exercises = (routine?.categories || []).reduce(
    (total, category) => total + (category.exercises || []).length,
    0
  );
  const sets = (routine?.categories || []).reduce(
    (total, category) => total + (category.exercises || []).reduce(
      (sum, exercise) => sum + (Number(exercise.sets) || 0),
      0
    ),
    0
  );
  return `${exercises} ejercicios · ${sets} series`;
};

export default function AIRoutineGenerator({ onClose, onApplyPlan }) {
  const { routines } = useRoutineContext();
  const { workouts } = useWorkoutContext();
  const [form, setForm] = useState(initialForm);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  const history = useMemo(
    () => buildExerciseProgress(workouts)
      .slice(0, 24)
      .map((exercise) => ({
        name: exercise.name,
        sessions: exercise.sessionCount,
        best_weight: Number(exercise.bestWeight) || 0,
        best_reps: Number(exercise.bestWeightReps) || 0,
      })),
    [workouts]
  );

  const toggleEquipment = (id) => {
    setForm((current) => {
      const exists = current.equipment.includes(id);
      const equipment = exists
        ? current.equipment.filter((item) => item !== id)
        : [...current.equipment, id];
      return { ...current, equipment };
    });
  };

  const handleGenerate = async () => {
    if (!form.equipment.length) {
      toast.error("Selecciona al menos un tipo de equipamiento");
      return;
    }

    setGenerating(true);
    try {
      const response = await generateAIRoutinePlan({
        ...form,
        history,
        currentRoutines: routines,
      });
      setResult(response);
      toast.success("Treino AI creó tu propuesta");
    } catch (error) {
      toast.error("No se pudo generar la rutina", {
        description: error?.message || "Inténtalo nuevamente.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!result?.plan) return;
    setApplying(true);
    try {
      await onApplyPlan?.(result.plan);
      toast.success("Plan aplicado a tus rutinas PPL");
      onClose?.();
    } catch (error) {
      toast.error("No se pudo aplicar el plan", {
        description: error?.message || "Revisa tu conexión e inténtalo otra vez.",
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="ai-routine-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="ai-routine-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-routine-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ai-routine-header">
          <div className="ai-routine-header__icon"><Sparkles size={22} /></div>
          <div>
            <span className="page-eyebrow">Treino AI</span>
            <h2 id="ai-routine-title">Genera tu PPL inteligente</h2>
            <p>Cuéntale a Treino qué quieres lograr y revisa la propuesta antes de guardarla.</p>
          </div>
          <button type="button" className="ai-routine-close" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </header>

        {!result ? (
          <div className="ai-routine-form">
            <section className="ai-form-section">
              <div className="ai-form-section__heading">
                <Target size={18} />
                <div><strong>1. Tu objetivo</strong><span>La prioridad principal del plan.</span></div>
              </div>
              <div className="ai-choice-grid ai-choice-grid--goals">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    className={`ai-choice-card ${form.goal === goal.id ? "is-selected" : ""}`}
                    onClick={() => setForm((current) => ({ ...current, goal: goal.id }))}
                  >
                    <strong>{goal.label}</strong>
                    <span>{goal.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="ai-form-section">
              <div className="ai-form-section__heading">
                <Dumbbell size={18} />
                <div><strong>2. Experiencia</strong><span>Para ajustar volumen y complejidad.</span></div>
              </div>
              <div className="ai-choice-grid ai-choice-grid--levels">
                {LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className={`ai-choice-card ${form.experience === level.id ? "is-selected" : ""}`}
                    onClick={() => setForm((current) => ({ ...current, experience: level.id }))}
                  >
                    <strong>{level.label}</strong>
                    <span>{level.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="ai-form-section ai-form-section--compact">
              <div className="ai-form-section__heading">
                <Clock3 size={18} />
                <div><strong>3. Tiempo disponible</strong><span>Treino ajustará cuánto cabe de verdad en cada sesión.</span></div>
              </div>
              <div className="ai-number-grid">
                <label>
                  <span>Días por semana</span>
                  <select value={form.daysPerWeek} onChange={(event) => setForm((current) => ({ ...current, daysPerWeek: Number(event.target.value) }))}>
                    {[3, 4, 5, 6].map((value) => <option key={value} value={value}>{value} días</option>)}
                  </select>
                </label>
                <label>
                  <span>Minutos por sesión</span>
                  <select value={form.sessionMinutes} onChange={(event) => setForm((current) => ({ ...current, sessionMinutes: Number(event.target.value) }))}>
                    {[30, 45, 60, 75, 90, 120].map((value) => <option key={value} value={value}>{value} min</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="ai-form-section">
              <div className="ai-form-section__heading">
                <Dumbbell size={18} />
                <div><strong>4. Equipamiento</strong><span>Solo usará ejercicios compatibles con lo que tienes.</span></div>
              </div>
              <div className="ai-equipment-grid">
                {EQUIPMENT.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={form.equipment.includes(item.id) ? "is-selected" : ""}
                    onClick={() => toggleEquipment(item.id)}
                  >
                    <span className="ai-check">{form.equipment.includes(item.id) ? "✓" : ""}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="ai-form-section ai-form-section--text">
              <label>
                <strong>Músculos o ejercicios que quieres priorizar</strong>
                <span>Opcional · Ej: pecho superior, espalda y bíceps.</span>
                <input
                  value={form.priorities}
                  onChange={(event) => setForm((current) => ({ ...current, priorities: event.target.value }))}
                  placeholder="Pecho superior, amplitud de espalda..."
                  maxLength={300}
                />
              </label>
              <label>
                <strong>Limitaciones o molestias</strong>
                <span>Opcional · Ayuda a evitar ejercicios poco adecuados para ti.</span>
                <textarea
                  value={form.restrictions}
                  onChange={(event) => setForm((current) => ({ ...current, restrictions: event.target.value }))}
                  placeholder="Ej: me molesta el hombro al hacer press vertical..."
                  rows={3}
                  maxLength={500}
                />
              </label>
              <label className="ai-toggle-row">
                <input
                  type="checkbox"
                  checked={form.keepFamiliarExercises}
                  onChange={(event) => setForm((current) => ({ ...current, keepFamiliarExercises: event.target.checked }))}
                />
                <span>
                  <strong>Priorizar ejercicios que ya conozco</strong>
                  <small>Treino AI tendrá en cuenta tu historial y tus rutinas actuales.</small>
                </span>
              </label>
            </section>

            <div className="ai-routine-actions">
              <button type="button" className="dialog-button" onClick={onClose}>Cancelar</button>
              <button type="button" className="primary-action-button ai-generate-button" onClick={handleGenerate} disabled={generating}>
                {generating ? <RefreshCw size={17} className="ai-spin" /> : <Sparkles size={17} />}
                {generating ? "Diseñando tu plan…" : "Generar con IA"}
              </button>
            </div>
          </div>
        ) : (
          <div className="ai-routine-result">
            <section className="ai-result-hero">
              <div className="ai-result-hero__badge"><Sparkles size={16} /> Propuesta generada</div>
              <h3>{result.plan.plan_name}</h3>
              <p>{result.plan.summary}</p>
              <div className="ai-weekly-guidance">
                <Target size={17} />
                <span>{result.plan.weekly_guidance}</span>
              </div>
            </section>

            <div className="ai-result-routines">
              {result.plan.routines.map((routine) => (
                <article key={routine.type} className={`ai-result-routine ai-result-routine--${routine.type}`}>
                  <header>
                    <span className="ai-result-routine__emoji">{routine.emoji}</span>
                    <div>
                      <span className="card-kicker">{routine.type}</span>
                      <h4>{routine.name}</h4>
                      <p>{routine.description}</p>
                    </div>
                    <small>{formatRoutineMeta(routine)}</small>
                  </header>
                  <div className="ai-result-categories">
                    {routine.categories.map((category, categoryIndex) => (
                      <section key={`${routine.type}-${category.name}-${categoryIndex}`}>
                        <strong>{category.name}</strong>
                        <div>
                          {category.exercises.map((exercise, exerciseIndex) => (
                            <div key={`${exercise.name}-${exerciseIndex}`} className="ai-result-exercise">
                              <span>{exercise.name}</span>
                              <small>{exercise.sets} × {exercise.reps_min}–{exercise.reps_max} · {exercise.rest_seconds}s</small>
                              {exercise.notes && <em>{exercise.notes}</em>}
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="ai-result-note">
              <CheckCircle2 size={17} />
              <p>La IA no asigna pesos: Treino seguirá usando tu historial, PR actual y meta de hoy para progresar sesión a sesión.</p>
            </div>

            <div className="ai-routine-actions">
              <button type="button" className="dialog-button" onClick={() => setResult(null)}>
                <RefreshCw size={16} /> Ajustar datos
              </button>
              <button type="button" className="primary-action-button" onClick={handleApply} disabled={applying}>
                <CheckCircle2 size={17} />
                {applying ? "Aplicando…" : "Usar este plan"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
