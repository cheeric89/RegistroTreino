import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calculator,
  Dumbbell,
  Ruler,
  Save,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "../../hooks/useProfile";
import { useBodyNutrition } from "../../hooks/useBodyNutrition";
import {
  estimateNutritionTargets,
  getMacroPercent,
  getNutritionTargets,
  getTodayNutrition,
  getWeightAnalytics,
} from "../../utils/nutritionBodyAnalytics";

const todayKey = () => new Date().toISOString().slice(0, 10);
const blankBody = () => ({
  entry_date: todayKey(),
  weight_kg: "",
  waist_cm: "",
  chest_cm: "",
  arm_cm: "",
  thigh_cm: "",
  hip_cm: "",
});

const blankNutrition = () => ({
  entry_date: todayKey(),
  calories: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
});

const formatDelta = (value) => {
  if (value == null) return "—";
  if (value === 0) return "0 kg";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("es-CL")} kg`;
};

function WeightTrendChart({ entries }) {
  const points = [...entries].slice(0, 14).reverse();
  if (points.length < 2) {
    return <div className="body-chart-empty">Registra al menos 2 pesos para ver la tendencia.</div>;
  }

  const values = points.map((entry) => Number(entry.weight_kg)).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const coordinates = points.map((entry, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 42 - ((Number(entry.weight_kg) - min) / range) * 34;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="body-chart-wrap">
      <svg viewBox="0 0 100 48" role="img" aria-label="Tendencia de peso corporal">
        <polyline className="body-chart-line" points={coordinates} fill="none" vectorEffect="non-scaling-stroke" />
        {points.map((entry, index) => {
          const [x, y] = coordinates.split(" ")[index].split(",");
          return <circle key={entry.entry_date} className="body-chart-dot" cx={x} cy={y} r="1.5" />;
        })}
      </svg>
      <div className="body-chart-labels">
        <span>{points[0]?.entry_date}</span>
        <strong>{min.toLocaleString("es-CL")}–{max.toLocaleString("es-CL")} kg</strong>
        <span>{points.at(-1)?.entry_date}</span>
      </div>
    </div>
  );
}

function MacroProgress({ label, value, target, unit = "g" }) {
  const percent = getMacroPercent(value, target);
  return (
    <div className="macro-progress">
      <div className="macro-progress__top">
        <strong>{label}</strong>
        <span>{Number(value || 0).toLocaleString("es-CL")} / {Number(target || 0).toLocaleString("es-CL")} {unit}</span>
      </div>
      <div className="macro-progress__track"><i style={{ width: `${Math.min(100, percent)}%` }} /></div>
      <small>{target > 0 ? `${percent}% del objetivo` : "Configura un objetivo"}</small>
    </div>
  );
}

export default function BodyNutritionView() {
  const { profile, saveProfile, saving: profileSaving } = useProfile();
  const {
    bodyEntries,
    nutritionEntries,
    loading,
    saving,
    syncError,
    saveBodyEntry,
    saveNutritionEntry,
  } = useBodyNutrition();
  const [mode, setMode] = useState("body");
  const [bodyForm, setBodyForm] = useState(blankBody);
  const [nutritionForm, setNutritionForm] = useState(blankNutrition);
  const [targetsForm, setTargetsForm] = useState({
    birth_date: "",
    energy_formula_sex: "",
    calorie_target: "",
    protein_target_g: "",
    carbs_target_g: "",
    fat_target_g: "",
  });

  useEffect(() => {
    const today = bodyEntries.find((entry) => entry.entry_date === todayKey());
    setBodyForm(today ? { ...blankBody(), ...today } : blankBody());
  }, [bodyEntries]);

  useEffect(() => {
    const today = getTodayNutrition(nutritionEntries);
    setNutritionForm({ ...blankNutrition(), ...today });
  }, [nutritionEntries]);

  useEffect(() => {
    if (!profile) return;
    setTargetsForm({
      birth_date: profile.birth_date || "",
      energy_formula_sex: profile.energy_formula_sex || "",
      calorie_target: profile.calorie_target ?? "",
      protein_target_g: profile.protein_target_g ?? "",
      carbs_target_g: profile.carbs_target_g ?? "",
      fat_target_g: profile.fat_target_g ?? "",
    });
  }, [profile]);

  const weightAnalytics = useMemo(
    () => getWeightAnalytics(bodyEntries, profile?.target_weight_kg),
    [bodyEntries, profile?.target_weight_kg]
  );
  const currentTargets = useMemo(
    () => getNutritionTargets({ ...profile, ...targetsForm }),
    [profile, targetsForm]
  );
  const estimate = useMemo(
    () => estimateNutritionTargets({ ...profile, ...targetsForm }),
    [profile, targetsForm]
  );

  const saveBody = async (event) => {
    event.preventDefault();
    const hasValue = ["weight_kg", "waist_cm", "chest_cm", "arm_cm", "thigh_cm", "hip_cm"]
      .some((key) => bodyForm[key] !== "" && bodyForm[key] != null);
    if (!hasValue) return toast.error("Agrega al menos un dato corporal");

    const result = await saveBodyEntry(bodyForm);
    if (bodyForm.weight_kg !== "") {
      await saveProfile({ weight_kg: Number(bodyForm.weight_kg) });
    }
    if (result.error) toast.warning("Guardado en este dispositivo; se sincronizará después");
    else toast.success("Registro corporal guardado");
  };

  const saveNutrition = async (event) => {
    event.preventDefault();
    const result = await saveNutritionEntry(nutritionForm);
    if (result.error) toast.warning("Nutrición guardada localmente; se sincronizará después");
    else toast.success("Nutrición de hoy guardada");
  };

  const saveTargets = async (nextTargets = null) => {
    const source = nextTargets || targetsForm;
    const result = await saveProfile({
      birth_date: source.birth_date || null,
      energy_formula_sex: source.energy_formula_sex || null,
      calorie_target: source.calorie_target === "" ? null : Math.max(0, Number(source.calorie_target) || 0),
      protein_target_g: source.protein_target_g === "" ? null : Math.max(0, Number(source.protein_target_g) || 0),
      carbs_target_g: source.carbs_target_g === "" ? null : Math.max(0, Number(source.carbs_target_g) || 0),
      fat_target_g: source.fat_target_g === "" ? null : Math.max(0, Number(source.fat_target_g) || 0),
      nutrition_tracking_enabled: true,
    });
    if (result.error) toast.error("No se pudieron guardar los objetivos nutricionales");
    else toast.success("Objetivos nutricionales guardados");
  };

  const applyEstimate = async () => {
    if (!estimate) {
      toast.info("Completa peso, altura, fecha de nacimiento y sexo de cálculo para estimar");
      return;
    }
    const next = {
      ...targetsForm,
      calorie_target: estimate.calories,
      protein_target_g: estimate.protein,
      carbs_target_g: estimate.carbs,
      fat_target_g: estimate.fat,
    };
    setTargetsForm(next);
    await saveTargets(next);
  };

  const latestBody = weightAnalytics.latest;
  const todayNutrition = getTodayNutrition(nutritionEntries);

  return (
    <div className="body-nutrition-view">
      <section className="body-nutrition-hero">
        <div>
          <span className="card-kicker">Treino 1.4</span>
          <h2>Nutrition & Body</h2>
          <p>Conecta tu rendimiento con lo que pasa fuera del gimnasio: peso, medidas, calorías y macros.</p>
        </div>
        <div className="body-nutrition-sync" role="status">
          <span className={syncError ? "is-offline" : "is-online"} />
          {loading ? "Sincronizando…" : syncError ? "Modo offline" : "Sincronizado"}
        </div>
      </section>

      <div className="body-nutrition-tabs" role="tablist">
        <button type="button" className={mode === "body" ? "is-active" : ""} onClick={() => setMode("body")}><Scale size={17} /> Cuerpo</button>
        <button type="button" className={mode === "nutrition" ? "is-active" : ""} onClick={() => setMode("nutrition")}><Utensils size={17} /> Nutrición</button>
      </div>

      {mode === "body" && (
        <div className="body-section-stack">
          <section className="body-overview-grid">
            <article className="body-weight-card">
              <div className="body-weight-card__top">
                <div><span className="card-kicker">Peso actual</span><strong>{latestBody ? `${latestBody.weight_kg.toLocaleString("es-CL")} kg` : "—"}</strong></div>
                <Scale size={22} />
              </div>
              <WeightTrendChart entries={weightAnalytics.entries} />
              <div className="body-delta-grid">
                <div><span>7 días</span><strong>{formatDelta(weightAnalytics.delta7)}</strong></div>
                <div><span>30 días</span><strong>{formatDelta(weightAnalytics.delta30)}</strong></div>
                <div><span>90 días</span><strong>{formatDelta(weightAnalytics.delta90)}</strong></div>
              </div>
            </article>

            <article className="body-goal-card">
              <div className="body-goal-card__icon"><Target size={22} /></div>
              <span className="card-kicker">Dirección</span>
              <h3>{profile?.target_weight_kg ? `Objetivo ${Number(profile.target_weight_kg).toLocaleString("es-CL")} kg` : "Define un peso objetivo"}</h3>
              <p>{weightAnalytics.remaining == null ? "Configúralo en Objetivos para comparar tu tendencia." : `${Math.abs(weightAnalytics.remaining).toLocaleString("es-CL")} kg ${weightAnalytics.remaining >= 0 ? "por subir" : "por bajar"}.`}</p>
              <div className="body-goal-pace"><TrendingUp size={16} /><span>Ritmo observado</span><strong>{weightAnalytics.weeklyPace == null ? "Aún sin datos" : `${weightAnalytics.weeklyPace > 0 ? "+" : ""}${weightAnalytics.weeklyPace} kg/sem`}</strong></div>
              <small>El ritmo se calcula a partir de tus registros; no es una recomendación médica.</small>
            </article>
          </section>

          <form className="body-entry-card" onSubmit={saveBody}>
            <header><div><span className="card-kicker">Registro corporal</span><h3>Actualiza tus medidas</h3></div><Ruler size={20} /></header>
            <div className="body-entry-grid">
              <label><span>Fecha</span><input type="date" value={bodyForm.entry_date} onChange={(event) => setBodyForm((current) => ({ ...current, entry_date: event.target.value }))} /></label>
              <label><span>Peso (kg)</span><input type="number" min="20" max="400" step="0.1" inputMode="decimal" value={bodyForm.weight_kg ?? ""} onChange={(event) => setBodyForm((current) => ({ ...current, weight_kg: event.target.value }))} /></label>
              <label><span>Cintura (cm)</span><input type="number" min="20" max="300" step="0.1" inputMode="decimal" value={bodyForm.waist_cm ?? ""} onChange={(event) => setBodyForm((current) => ({ ...current, waist_cm: event.target.value }))} /></label>
              <label><span>Pecho (cm)</span><input type="number" min="20" max="300" step="0.1" inputMode="decimal" value={bodyForm.chest_cm ?? ""} onChange={(event) => setBodyForm((current) => ({ ...current, chest_cm: event.target.value }))} /></label>
              <label><span>Brazo (cm)</span><input type="number" min="10" max="100" step="0.1" inputMode="decimal" value={bodyForm.arm_cm ?? ""} onChange={(event) => setBodyForm((current) => ({ ...current, arm_cm: event.target.value }))} /></label>
              <label><span>Muslo (cm)</span><input type="number" min="10" max="150" step="0.1" inputMode="decimal" value={bodyForm.thigh_cm ?? ""} onChange={(event) => setBodyForm((current) => ({ ...current, thigh_cm: event.target.value }))} /></label>
              <label><span>Cadera (cm)</span><input type="number" min="20" max="300" step="0.1" inputMode="decimal" value={bodyForm.hip_cm ?? ""} onChange={(event) => setBodyForm((current) => ({ ...current, hip_cm: event.target.value }))} /></label>
            </div>
            <button type="submit" className="primary-action-button" disabled={saving}><Save size={16} /> {saving ? "Guardando…" : "Guardar registro"}</button>
          </form>

          {bodyEntries.length > 0 && (
            <section className="body-history-card">
              <header><div><span className="card-kicker">Historial</span><h3>Últimos registros</h3></div><Activity size={20} /></header>
              <div className="body-history-list">
                {bodyEntries.slice(0, 8).map((entry) => (
                  <div key={entry.entry_date}>
                    <strong>{entry.entry_date}</strong>
                    <span>{entry.weight_kg ? `${Number(entry.weight_kg).toLocaleString("es-CL")} kg` : "Sin peso"}</span>
                    <small>{[
                      entry.waist_cm && `Cintura ${entry.waist_cm}`,
                      entry.chest_cm && `Pecho ${entry.chest_cm}`,
                      entry.arm_cm && `Brazo ${entry.arm_cm}`,
                      entry.thigh_cm && `Muslo ${entry.thigh_cm}`,
                    ].filter(Boolean).join(" · ") || "Sin medidas adicionales"}</small>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {mode === "nutrition" && (
        <div className="nutrition-section-stack">
          <section className="nutrition-today-card">
            <header><div><span className="card-kicker">Hoy</span><h3>Tu objetivo diario</h3></div><Utensils size={20} /></header>
            <div className="nutrition-calorie-hero">
              <div><strong>{Number(todayNutrition.calories || 0).toLocaleString("es-CL")}</strong><span>kcal registradas</span></div>
              <div><strong>{currentTargets.calories ? currentTargets.calories.toLocaleString("es-CL") : "—"}</strong><span>kcal objetivo</span></div>
            </div>
            <div className="nutrition-macro-grid">
              <MacroProgress label="Proteína" value={todayNutrition.protein_g} target={currentTargets.protein} />
              <MacroProgress label="Carbohidratos" value={todayNutrition.carbs_g} target={currentTargets.carbs} />
              <MacroProgress label="Grasas" value={todayNutrition.fat_g} target={currentTargets.fat} />
            </div>
          </section>

          <form className="nutrition-entry-card" onSubmit={saveNutrition}>
            <header><div><span className="card-kicker">Registro diario</span><h3>¿Qué llevas hoy?</h3></div><Dumbbell size={19} /></header>
            <div className="nutrition-entry-grid">
              <label><span>Fecha</span><input type="date" value={nutritionForm.entry_date} onChange={(event) => setNutritionForm((current) => ({ ...current, entry_date: event.target.value }))} /></label>
              <label><span>Calorías</span><input type="number" min="0" step="1" inputMode="numeric" value={nutritionForm.calories ?? ""} onChange={(event) => setNutritionForm((current) => ({ ...current, calories: event.target.value }))} placeholder="2400" /></label>
              <label><span>Proteína (g)</span><input type="number" min="0" step="0.1" inputMode="decimal" value={nutritionForm.protein_g ?? ""} onChange={(event) => setNutritionForm((current) => ({ ...current, protein_g: event.target.value }))} placeholder="140" /></label>
              <label><span>Carbos (g)</span><input type="number" min="0" step="0.1" inputMode="decimal" value={nutritionForm.carbs_g ?? ""} onChange={(event) => setNutritionForm((current) => ({ ...current, carbs_g: event.target.value }))} placeholder="300" /></label>
              <label><span>Grasas (g)</span><input type="number" min="0" step="0.1" inputMode="decimal" value={nutritionForm.fat_g ?? ""} onChange={(event) => setNutritionForm((current) => ({ ...current, fat_g: event.target.value }))} placeholder="70" /></label>
            </div>
            <button type="submit" className="primary-action-button" disabled={saving}><Save size={16} /> {saving ? "Guardando…" : "Guardar día"}</button>
          </form>

          <section className="nutrition-target-card">
            <header><div><span className="card-kicker">Configuración</span><h3>Calorías y macros objetivo</h3></div><Target size={20} /></header>
            <div className="nutrition-estimate-profile">
              <label><span>Fecha de nacimiento</span><input type="date" value={targetsForm.birth_date} onChange={(event) => setTargetsForm((current) => ({ ...current, birth_date: event.target.value }))} /></label>
              <div className="nutrition-sex-field"><span>Sexo para cálculo energético</span><div><button type="button" className={targetsForm.energy_formula_sex === "male" ? "is-selected" : ""} onClick={() => setTargetsForm((current) => ({ ...current, energy_formula_sex: "male" }))}>Masculino</button><button type="button" className={targetsForm.energy_formula_sex === "female" ? "is-selected" : ""} onClick={() => setTargetsForm((current) => ({ ...current, energy_formula_sex: "female" }))}>Femenino</button></div></div>
            </div>
            <div className="nutrition-target-grid">
              <label><span>Calorías</span><input type="number" min="0" step="10" value={targetsForm.calorie_target} onChange={(event) => setTargetsForm((current) => ({ ...current, calorie_target: event.target.value }))} /></label>
              <label><span>Proteína (g)</span><input type="number" min="0" step="1" value={targetsForm.protein_target_g} onChange={(event) => setTargetsForm((current) => ({ ...current, protein_target_g: event.target.value }))} /></label>
              <label><span>Carbos (g)</span><input type="number" min="0" step="1" value={targetsForm.carbs_target_g} onChange={(event) => setTargetsForm((current) => ({ ...current, carbs_target_g: event.target.value }))} /></label>
              <label><span>Grasas (g)</span><input type="number" min="0" step="1" value={targetsForm.fat_target_g} onChange={(event) => setTargetsForm((current) => ({ ...current, fat_target_g: event.target.value }))} /></label>
            </div>
            <div className="nutrition-target-actions">
              <button type="button" className="secondary-action-button" onClick={applyEstimate}><Calculator size={16} /> Estimar punto de partida</button>
              <button type="button" className="primary-action-button" onClick={() => saveTargets()} disabled={profileSaving}><Save size={16} /> Guardar objetivos</button>
            </div>
            {estimate && <div className="nutrition-estimate-note"><Sparkles size={16} /><span>Estimación orientativa: mantenimiento ~{estimate.maintenance.toLocaleString("es-CL")} kcal. Treino propone {estimate.calories.toLocaleString("es-CL")} kcal según tu objetivo actual.</span></div>}
            <p className="nutrition-safety-note">La estimación es solo un punto de partida para adultos y puedes editarla. No sustituye indicaciones de un profesional de salud o nutrición.</p>
          </section>
        </div>
      )}
    </div>
  );
}
