// src/components/profile/ProgressView.jsx
// Estructura base para analíticas de progreso (Módulo 4: Recharts).
//
// Por ahora mostramos las métricas que YA podemos calcular sin gráficas
// (sesiones, volumen, racha) para que esta vista se sienta viva desde
// el día uno, y dejamos dos bloques placeholder con el layout final
// para cuando conectemos Recharts — así no hay que tocar el resto de
// la vista en ese momento, solo reemplazar el contenido interno.

import { Flame, Dumbbell, TrendingUp, LineChart, BarChart3 } from "lucide-react";
import { getAllWorkouts } from "../../utils/storage";
import {
  getTotalSessions,
  getTotalVolume,
  getCurrentStreak,
  getSessionsInLastDays,
} from "../../utils/workoutStats";

export default function ProgressView() {
  // NOTA: workoutform.jsx hoy guarda solo en localStorage (utils/storage),
  // no a través de useWorkouts.js/Supabase. Cuando se conecte ese flujo,
  // cambiar esto por fetchWorkouts() del hook para reflejar datos
  // sincronizados entre dispositivos en vez de solo este navegador.
  const workouts = getAllWorkouts();

  const totalSessions = getTotalSessions(workouts);
  const totalVolume = getTotalVolume(workouts);
  const streak = getCurrentStreak(workouts);
  const weekCount = getSessionsInLastDays(workouts, 7);

  return (
    <div className="progress-view">
      <div className="progress-stats-grid">
        <div className="progress-stat-card">
          <Flame size={20} className="progress-stat-icon" />
          <span className="progress-stat-num">{streak}</span>
          <span className="progress-stat-label">Días de racha</span>
        </div>
        <div className="progress-stat-card">
          <Dumbbell size={20} className="progress-stat-icon" />
          <span className="progress-stat-num">{totalSessions}</span>
          <span className="progress-stat-label">Sesiones totales</span>
        </div>
        <div className="progress-stat-card">
          <TrendingUp size={20} className="progress-stat-icon" />
          <span className="progress-stat-num">{weekCount}/7</span>
          <span className="progress-stat-label">Esta semana</span>
        </div>
        <div className="progress-stat-card">
          <BarChart3 size={20} className="progress-stat-icon" />
          <span className="progress-stat-num">
            {totalVolume > 0 ? Math.round(totalVolume).toLocaleString("es-CL") : "—"}
          </span>
          <span className="progress-stat-label">Volumen total (kg)</span>
        </div>
      </div>

      {/* ── Placeholders — listos para reemplazar por <LineChart> de Recharts ── */}
      <div className="progress-chart-placeholder">
        <LineChart size={28} />
        <p>Volumen por semana</p>
        <span>Próximamente con Recharts 📊</span>
      </div>

      <div className="progress-chart-placeholder">
        <BarChart3 size={28} />
        <p>Distribución por grupo muscular</p>
        <span>Próximamente</span>
      </div>
    </div>
  );
}