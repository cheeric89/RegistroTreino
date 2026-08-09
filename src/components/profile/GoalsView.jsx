import { useEffect, useMemo, useState } from "react";
import { Save, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "../../hooks/useProfile";

const GOALS = [
  { value: "muscle_gain", label: "Ganar masa muscular", description: "Prioriza progresión, volumen y ganancia gradual." },
  { value: "fat_loss", label: "Perder grasa", description: "Mantén fuerza mientras reduces peso corporal." },
  { value: "recomp", label: "Recomposición", description: "Busca mejorar composición corporal manteniendo el peso relativamente estable." },
  { value: "strength", label: "Ganar fuerza", description: "Prioriza rendimiento en ejercicios y progresión de cargas." },
  { value: "maintain", label: "Mantener", description: "Conserva rendimiento, masa y hábitos actuales." },
];

const ACTIVITY = [
  { value: "sedentary", label: "Baja", description: "Mayormente sentado fuera del entrenamiento" },
  { value: "light", label: "Ligera", description: "Algo de caminata o movimiento diario" },
  { value: "moderate", label: "Moderada", description: "Te mueves bastante durante el día" },
  { value: "high", label: "Alta", description: "Trabajo físico, mucho deporte o movimiento" },
];

const TRENDS = [
  { value: "gaining", label: "Subiendo", icon: TrendingUp },
  { value: "stable", label: "Estable", icon: Target },
  { value: "losing", label: "Bajando", icon: TrendingDown },
  { value: "unknown", label: "Aún no sé", icon: Sparkles },
];

export default function GoalsView() {
  const { profile, loading, saving, saveProfile } = useProfile();
  const [form, setForm] = useState({
    training_goal: "muscle_gain",
    weight_kg: "",
    target_weight_kg: "",
    height_cm: "",
    activity_level: "moderate",
    weekly_training_goal: 4,
    weight_trend: "unknown",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      training_goal: profile.training_goal || "muscle_gain",
      weight_kg: profile.weight_kg ?? "",
      target_weight_kg: profile.target_weight_kg ?? "",
      height_cm: profile.height_cm ?? "",
      activity_level: profile.activity_level || "moderate",
      weekly_training_goal: profile.weekly_training_goal ?? 4,
      weight_trend: profile.weight_trend || "unknown",
    });
  }, [profile]);

  const selectedGoal = useMemo(
    () => GOALS.find((goal) => goal.value === form.training_goal) || GOALS[0],
    [form.training_goal]
  );

  const save = async (event) => {
    event.preventDefault();
    const result = await saveProfile({
      training_goal: form.training_goal,
      weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
      target_weight_kg: form.target_weight_kg === "" ? null : Number(form.target_weight_kg),
      height_cm: form.height_cm === "" ? null : Number(form.height_cm),
      activity_level: form.activity_level,
      weekly_training_goal: Math.min(7, Math.max(1, Number(form.weekly_training_goal) || 1)),
      weight_trend: form.weight_trend,
    });

    if (result.error) {
      toast.error("No se pudieron guardar tus objetivos");
      return;
    }
    toast.success("Objetivos actualizados");
  };

  if (loading) return <div className="profile-loading-card"><span /><span /><span /></div>;

  return (
    <form className="goals-view" onSubmit={save}>
      <section className="goals-hero-card">
        <div className="goals-hero-card__icon"><Target size={23} /></div>
        <div>
          <span className="card-kicker">Dirección de tu progreso</span>
          <h2>{selectedGoal.label}</h2>
          <p>{selectedGoal.description}</p>
        </div>
      </section>

      <section className="goals-section-card">
        <header>
          <div><span className="card-kicker">Objetivo principal</span><h2>¿Qué quieres conseguir?</h2></div>
          <Sparkles size={19} />
        </header>
        <div className="goals-choice-grid">
          {GOALS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              className={form.training_goal === goal.value ? "is-selected" : ""}
              onClick={() => setForm((current) => ({ ...current, training_goal: goal.value }))}
            >
              <strong>{goal.label}</strong>
              <span>{goal.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="goals-section-card">
        <header>
          <div><span className="card-kicker">Base corporal</span><h2>Datos para personalizar Treino</h2></div>
          <Target size={19} />
        </header>
        <div className="goals-fields-grid">
          <label><span>Peso actual (kg)</span><input type="number" inputMode="decimal" step="0.1" min="20" max="400" value={form.weight_kg} onChange={(event) => setForm((current) => ({ ...current, weight_kg: event.target.value }))} placeholder="70" /></label>
          <label><span>Peso objetivo (kg)</span><input type="number" inputMode="decimal" step="0.1" min="20" max="400" value={form.target_weight_kg} onChange={(event) => setForm((current) => ({ ...current, target_weight_kg: event.target.value }))} placeholder="75" /></label>
          <label><span>Altura (cm)</span><input type="number" inputMode="numeric" min="100" max="250" value={form.height_cm} onChange={(event) => setForm((current) => ({ ...current, height_cm: event.target.value }))} placeholder="175" /></label>
          <label><span>Sesiones objetivo / semana</span><input type="number" inputMode="numeric" min="1" max="7" value={form.weekly_training_goal} onChange={(event) => setForm((current) => ({ ...current, weekly_training_goal: event.target.value }))} /></label>
        </div>
      </section>

      <section className="goals-section-card">
        <header><div><span className="card-kicker">Preparado para nutrición</span><h2>Actividad y tendencia</h2></div><Sparkles size={19} /></header>
        <div className="activity-choice-grid">
          {ACTIVITY.map((item) => (
            <button key={item.value} type="button" className={form.activity_level === item.value ? "is-selected" : ""} onClick={() => setForm((current) => ({ ...current, activity_level: item.value }))}>
              <strong>{item.label}</strong><span>{item.description}</span>
            </button>
          ))}
        </div>
        <div className="weight-trend-row">
          <span>Tu peso últimamente</span>
          <div>
            {TRENDS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" className={form.weight_trend === value ? "is-selected" : ""} onClick={() => setForm((current) => ({ ...current, weight_trend: value }))}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
        <p className="nutrition-ready-note">Con esto Treino ya tendrá la base para un futuro módulo de calorías, macros y tendencia corporal. Todavía no calcula dietas ni calorías automáticamente.</p>
      </section>

      <button type="submit" className="primary-action-button goals-save-button" disabled={saving}><Save size={17} /> {saving ? "Guardando…" : "Guardar objetivos"}</button>
    </form>
  );
}
