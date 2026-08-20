import { Scale, Target, TrendingUp, Utensils } from "lucide-react";
import { useBodyNutrition } from "../hooks/useBodyNutrition";
import {
  getNutritionTargets,
  getTodayNutrition,
  getWeightAnalytics,
} from "../utils/nutritionBodyAnalytics";

const signed = (value, unit = "kg") => {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("es-CL")} ${unit}`;
};

export default function NutritionBodyDashboard({ profile }) {
  const { bodyEntries, nutritionEntries, loading, syncError } = useBodyNutrition();
  const weight = getWeightAnalytics(bodyEntries, profile?.target_weight_kg);
  const today = getTodayNutrition(nutritionEntries);
  const targets = getNutritionTargets(profile);
  const caloriePercent = targets.calories > 0
    ? Math.min(100, Math.round((Number(today.calories || 0) / targets.calories) * 100))
    : 0;

  const hasData = bodyEntries.length > 0 || nutritionEntries.length > 0 || targets.calories > 0;

  return (
    <section className="nutrition-body-dashboard" aria-label="Resumen de cuerpo y nutrición">
      <header className="smart-card-heading">
        <div>
          <span className="card-kicker">Nutrition & Body</span>
          <h2>Tu progreso fuera del gimnasio</h2>
        </div>
        <span className={`nutrition-body-dashboard__sync ${syncError ? "is-offline" : ""}`}>
          {loading ? "Sincronizando…" : syncError ? "Offline" : "Al día"}
        </span>
      </header>

      {hasData ? (
        <div className="nutrition-body-dashboard__grid">
          <article className="nutrition-body-mini-card">
            <div className="nutrition-body-mini-card__icon"><Scale size={18} /></div>
            <span>Peso actual</span>
            <strong>{weight.latest ? `${weight.latest.weight_kg.toLocaleString("es-CL")} kg` : profile?.weight_kg ? `${Number(profile.weight_kg).toLocaleString("es-CL")} kg` : "—"}</strong>
            <small>30 días: {signed(weight.delta30)}</small>
          </article>

          <article className="nutrition-body-mini-card">
            <div className="nutrition-body-mini-card__icon"><TrendingUp size={18} /></div>
            <span>Ritmo observado</span>
            <strong>{weight.weeklyPace == null ? "Aún sin datos" : signed(weight.weeklyPace, "kg/sem")}</strong>
            <small>{weight.targetWeight ? `Objetivo ${weight.targetWeight.toLocaleString("es-CL")} kg` : "Sin peso objetivo"}</small>
          </article>

          <article className="nutrition-body-mini-card nutrition-body-mini-card--nutrition">
            <div className="nutrition-body-mini-card__icon"><Utensils size={18} /></div>
            <span>Calorías hoy</span>
            <strong>{Number(today.calories || 0).toLocaleString("es-CL")} {targets.calories ? `/ ${targets.calories.toLocaleString("es-CL")}` : "kcal"}</strong>
            <div className="nutrition-body-mini-progress"><i style={{ width: `${caloriePercent}%` }} /></div>
          </article>

          <article className="nutrition-body-mini-card nutrition-body-mini-card--macros">
            <div className="nutrition-body-mini-card__icon"><Target size={18} /></div>
            <span>Macros hoy</span>
            <strong>{Number(today.protein_g || 0).toLocaleString("es-CL")} g proteína</strong>
            <small>{Number(today.carbs_g || 0).toLocaleString("es-CL")} g carbos · {Number(today.fat_g || 0).toLocaleString("es-CL")} g grasas</small>
          </article>
        </div>
      ) : (
        <div className="nutrition-body-dashboard__empty">
          <Scale size={20} />
          <div><strong>Empieza tu seguimiento corporal</strong><span>Registra tu primer peso o configura tus objetivos nutricionales desde Perfil → Cuerpo & Nutrición.</span></div>
        </div>
      )}
    </section>
  );
}
