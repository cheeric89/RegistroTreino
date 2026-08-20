import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calculator,
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
  getLocalDateKey,
  getMacroPercent,
  getNutritionTargets,
  getTodayNutrition,
  getWeightAnalytics,
} from "../../utils/nutritionBodyAnalytics";
import MealLogger from "./MealLogger";

const BODY_FIELDS = [
  ["weight_kg", "Peso", "kg", 20, 400],
  ["waist_cm", "Cintura", "cm", 20, 300],
  ["chest_cm", "Pecho", "cm", 20, 300],
  ["arm_cm", "Brazo", "cm", 10, 100],
  ["thigh_cm", "Muslo", "cm", 10, 150],
  ["hip_cm", "Cadera", "cm", 20, 300],
];

const emptyBody = () => ({ entry_date: getLocalDateKey() });

const formatDelta = (value) => value == null
  ? "—"
  : `${value > 0 ? "+" : ""}${value.toLocaleString("es-CL")} kg`;

function WeightChart({ entries }) {
  const points = [...entries].slice(0, 14).reverse();
  if (points.length < 2) return <div className="body-chart-empty">Registra al menos 2 pesos para ver la tendencia.</div>;

  const values = points.map((item) => Number(item.weight_kg));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const coords = points.map((item, index) => ({
    key: item.entry_date,
    x: points.length === 1 ? 50 : (index / (points.length - 1)) * 100,
    y: 42 - ((Number(item.weight_kg) - min) / range) * 34,
  }));

  return (
    <div className="body-chart-wrap">
      <svg viewBox="0 0 100 48" role="img" aria-label="Tendencia de peso corporal">
        <polyline className="body-chart-line" points={coords.map((item) => `${item.x},${item.y}`).join(" ")} fill="none" vectorEffect="non-scaling-stroke" />
        {coords.map((item) => <circle key={item.key} className="body-chart-dot" cx={item.x} cy={item.y} r="1.5" />)}
      </svg>
      <div className="body-chart-labels"><span>{points[0].entry_date}</span><strong>{min.toLocaleString("es-CL")}–{max.toLocaleString("es-CL")} kg</strong><span>{points.at(-1).entry_date}</span></div>
    </div>
  );
}

function MacroProgress({ label, value, target, unit = "g" }) {
  const percent = getMacroPercent(value, target);
  return (
    <div className="macro-progress">
      <div className="macro-progress__top"><strong>{label}</strong><span>{Number(value || 0).toLocaleString("es-CL")} / {Number(target || 0).toLocaleString("es-CL")} {unit}</span></div>
      <div className="macro-progress__track"><i style={{ width: `${Math.min(100, percent)}%` }} /></div>
      <small>{target > 0 ? `${percent}% del objetivo` : "Configura un objetivo"}</small>
    </div>
  );
}

export default function BodyNutritionView() {
  const { profile, saveProfile, saving: profileSaving } = useProfile();
  const { bodyEntries, nutritionEntries, loading, saving, syncError, saveBodyEntry, saveNutritionEntry } = useBodyNutrition();
  const [mode, setMode] = useState("body");
  const [bodyForm, setBodyForm] = useState(emptyBody);
  const [targets, setTargets] = useState({ birth_date: "", energy_formula_sex: "", calorie_target: "", protein_target_g: "", carbs_target_g: "", fat_target_g: "" });

  useEffect(() => {
    const today = bodyEntries.find((item) => item.entry_date === getLocalDateKey());
    setBodyForm(today ? { ...emptyBody(), ...today } : emptyBody());
  }, [bodyEntries]);

  useEffect(() => {
    if (!profile) return;
    setTargets({
      birth_date: profile.birth_date || "",
      energy_formula_sex: profile.energy_formula_sex || "",
      calorie_target: profile.calorie_target ?? "",
      protein_target_g: profile.protein_target_g ?? "",
      carbs_target_g: profile.carbs_target_g ?? "",
      fat_target_g: profile.fat_target_g ?? "",
    });
  }, [profile]);

  const weight = useMemo(() => getWeightAnalytics(bodyEntries, profile?.target_weight_kg), [bodyEntries, profile?.target_weight_kg]);
  const macroTargets = useMemo(() => getNutritionTargets({ ...profile, ...targets }), [profile, targets]);
  const estimate = useMemo(() => estimateNutritionTargets({ ...profile, ...targets }), [profile, targets]);
  const todayNutrition = getTodayNutrition(nutritionEntries);

  const handleBodySave = async (event) => {
    event.preventDefault();
    const hasData = BODY_FIELDS.some(([key]) => bodyForm[key] !== "" && bodyForm[key] != null);
    if (!hasData) return toast.error("Agrega al menos un dato corporal");
    const result = await saveBodyEntry(bodyForm);
    if (bodyForm.weight_kg !== "" && bodyForm.weight_kg != null) await saveProfile({ weight_kg: Number(bodyForm.weight_kg) });
    result.error ? toast.warning("Guardado localmente; se sincronizará después") : toast.success("Registro corporal guardado");
  };

  const persistTargets = async (source = targets) => {
    const result = await saveProfile({
      birth_date: source.birth_date || null,
      energy_formula_sex: source.energy_formula_sex || null,
      calorie_target: source.calorie_target === "" ? null : Math.max(0, Number(source.calorie_target) || 0),
      protein_target_g: source.protein_target_g === "" ? null : Math.max(0, Number(source.protein_target_g) || 0),
      carbs_target_g: source.carbs_target_g === "" ? null : Math.max(0, Number(source.carbs_target_g) || 0),
      fat_target_g: source.fat_target_g === "" ? null : Math.max(0, Number(source.fat_target_g) || 0),
      nutrition_tracking_enabled: true,
    });
    result.error ? toast.error("No se pudieron guardar los objetivos") : toast.success("Objetivos nutricionales guardados");
  };

  const applyEstimate = async () => {
    if (!estimate) return toast.info("Completa peso, altura, fecha de nacimiento y sexo de cálculo para estimar");
    const next = { ...targets, calorie_target: estimate.calories, protein_target_g: estimate.protein, carbs_target_g: estimate.carbs, fat_target_g: estimate.fat };
    setTargets(next);
    await persistTargets(next);
  };

  return (
    <div className="body-nutrition-view">
      <section className="body-nutrition-hero">
        <div><span className="card-kicker">Treino 1.4</span><h2>Nutrition & Body</h2><p>Conecta tu rendimiento con peso, medidas, calorías y macros.</p></div>
        <div className="body-nutrition-sync" role="status"><span className={syncError ? "is-offline" : "is-online"} />{loading ? "Sincronizando…" : syncError ? "Modo offline" : "Sincronizado"}</div>
      </section>

      <div className="body-nutrition-tabs" role="tablist">
        <button type="button" className={mode === "body" ? "is-active" : ""} onClick={() => setMode("body")}><Scale size={17} /> Cuerpo</button>
        <button type="button" className={mode === "nutrition" ? "is-active" : ""} onClick={() => setMode("nutrition")}><Utensils size={17} /> Nutrición</button>
      </div>

      {mode === "body" ? (
        <div className="body-section-stack">
          <section className="body-overview-grid">
            <article className="body-weight-card">
              <div className="body-weight-card__top"><div><span className="card-kicker">Peso actual</span><strong>{weight.latest ? `${weight.latest.weight_kg.toLocaleString("es-CL")} kg` : "—"}</strong></div><Scale size={22} /></div>
              <WeightChart entries={weight.entries} />
              <div className="body-delta-grid"><div><span>7 días</span><strong>{formatDelta(weight.delta7)}</strong></div><div><span>30 días</span><strong>{formatDelta(weight.delta30)}</strong></div><div><span>90 días</span><strong>{formatDelta(weight.delta90)}</strong></div></div>
            </article>
            <article className="body-goal-card">
              <div className="body-goal-card__icon"><Target size={22} /></div><span className="card-kicker">Dirección</span>
              <h3>{weight.targetWeight ? `Objetivo ${weight.targetWeight.toLocaleString("es-CL")} kg` : "Define un peso objetivo"}</h3>
              <p>{weight.remaining == null ? "Configúralo en Objetivos para comparar tu tendencia." : `${Math.abs(weight.remaining).toLocaleString("es-CL")} kg ${weight.remaining >= 0 ? "por subir" : "por bajar"}.`}</p>
              <div className="body-goal-pace"><TrendingUp size={16} /><span>Ritmo observado</span><strong>{weight.weeklyPace == null ? "Aún sin datos" : `${weight.weeklyPace > 0 ? "+" : ""}${weight.weeklyPace} kg/sem`}</strong></div>
              <small>Se calcula desde tus registros y no constituye una recomendación médica.</small>
            </article>
          </section>

          <form className="body-entry-card" onSubmit={handleBodySave}>
            <header><div><span className="card-kicker">Registro corporal</span><h3>Actualiza tus medidas</h3></div><Ruler size={20} /></header>
            <div className="body-entry-grid">
              <label><span>Fecha</span><input type="date" value={bodyForm.entry_date} onChange={(event) => setBodyForm((current) => ({ ...current, entry_date: event.target.value }))} /></label>
              {BODY_FIELDS.map(([key, label, unit, min, max]) => <label key={key}><span>{label} ({unit})</span><input type="number" inputMode="decimal" step="0.1" min={min} max={max} value={bodyForm[key] ?? ""} onChange={(event) => setBodyForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
            </div>
            <button type="submit" className="primary-action-button" disabled={saving}><Save size={16} /> {saving ? "Guardando…" : "Guardar registro"}</button>
          </form>

          {bodyEntries.length > 0 && <section className="body-history-card"><header><div><span className="card-kicker">Historial</span><h3>Últimos registros</h3></div><Activity size={20} /></header><div className="body-history-list">{bodyEntries.slice(0, 8).map((entry) => <div key={entry.entry_date}><strong>{entry.entry_date}</strong><span>{entry.weight_kg ? `${Number(entry.weight_kg).toLocaleString("es-CL")} kg` : "Sin peso"}</span><small>{BODY_FIELDS.slice(1).map(([key, label]) => entry[key] ? `${label} ${entry[key]}` : null).filter(Boolean).join(" · ") || "Sin medidas adicionales"}</small></div>)}</div></section>}
        </div>
      ) : (
        <div className="nutrition-section-stack">
          <section className="nutrition-today-card">
            <header><div><span className="card-kicker">Hoy</span><h3>Tu objetivo diario</h3></div><Utensils size={20} /></header>
            <div className="nutrition-calorie-hero"><div><strong>{Number(todayNutrition.calories || 0).toLocaleString("es-CL")}</strong><span>kcal registradas</span></div><div><strong>{macroTargets.calories ? macroTargets.calories.toLocaleString("es-CL") : "—"}</strong><span>kcal objetivo</span></div></div>
            <div className="nutrition-macro-grid"><MacroProgress label="Proteína" value={todayNutrition.protein_g} target={macroTargets.protein} /><MacroProgress label="Carbohidratos" value={todayNutrition.carbs_g} target={macroTargets.carbs} /><MacroProgress label="Grasas" value={todayNutrition.fat_g} target={macroTargets.fat} /></div>
          </section>

          <MealLogger entry={todayNutrition} saving={saving} onSave={saveNutritionEntry} />

          <section className="nutrition-target-card">
            <header><div><span className="card-kicker">Configuración</span><h3>Calorías y macros objetivo</h3></div><Target size={20} /></header>
            <div className="nutrition-estimate-profile"><label><span>Fecha de nacimiento</span><input type="date" value={targets.birth_date} onChange={(event) => setTargets((current) => ({ ...current, birth_date: event.target.value }))} /></label><div className="nutrition-sex-field"><span>Sexo para cálculo energético</span><div><button type="button" className={targets.energy_formula_sex === "male" ? "is-selected" : ""} onClick={() => setTargets((current) => ({ ...current, energy_formula_sex: "male" }))}>Masculino</button><button type="button" className={targets.energy_formula_sex === "female" ? "is-selected" : ""} onClick={() => setTargets((current) => ({ ...current, energy_formula_sex: "female" }))}>Femenino</button></div></div></div>
            <div className="nutrition-target-grid">{[["calorie_target", "Calorías"], ["protein_target_g", "Proteína (g)"], ["carbs_target_g", "Carbos (g)"], ["fat_target_g", "Grasas (g)"]].map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" step="1" value={targets[key]} onChange={(event) => setTargets((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
            <div className="nutrition-target-actions"><button type="button" className="secondary-action-button" onClick={applyEstimate}><Calculator size={16} /> Estimar punto de partida</button><button type="button" className="primary-action-button" onClick={() => persistTargets()} disabled={profileSaving}><Save size={16} /> Guardar objetivos</button></div>
            {estimate && <div className="nutrition-estimate-note"><Sparkles size={16} /><span>Mantenimiento estimado ~{estimate.maintenance.toLocaleString("es-CL")} kcal; propuesta inicial {estimate.calories.toLocaleString("es-CL")} kcal según tu objetivo actual.</span></div>}
            <p className="nutrition-safety-note">La estimación es orientativa, solo se habilita para adultos y siempre puedes editarla. No sustituye indicaciones de un profesional de salud o nutrición.</p>
          </section>
        </div>
      )}
    </div>
  );
}
