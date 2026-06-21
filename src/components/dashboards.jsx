// Dashboard.jsx — Pantalla principal
// Para extender: agregar un resumen de los últimos 7 días de entrenamiento,
// estadísticas de racha (streak), o un gráfico de progreso con recharts.

import { Dumbbell, Zap, TrendingUp, Calendar } from "lucide-react";
import { getRecentWorkouts, deleteWorkout } from "../utils/storage"; // <--- AQUÍ ESTÁ EL CAMBIO

export default function Dashboard({ onStart, onOpenWorkout }) {
  const recent = getRecentWorkouts(3);

  return (
    <div className="screen dashboard-screen">
      {/* Header */}
      <div className="dashboard-header">
        <div className="logo-mark">
          <Dumbbell size={22} strokeWidth={2.5} />
        </div>
        <span className="logo-text">TREINO</span>
      </div>

      {/* Hero */}
      <div className="dashboard-hero">
        <p className="hero-eyebrow">
          <Zap size={13} className="eyebrow-icon" />
          Listo para entrenar
        </p>
        <h1 className="hero-title">
          Cada serie<br />
          <span className="hero-accent">cuenta.</span>
        </h1>
        <p className="hero-sub">
          Registra tu entrenamiento, sigue tu progreso y supera tus límites.
        </p>
      </div>

      {/* CTA Principal */}
      <button className="cta-button" onClick={onStart}>
        <Dumbbell size={20} strokeWidth={2.5} />
        Registrar Entrenamiento
      </button>

      {/* Historial reciente */}
{recent.length > 0 && (
  <div className="recent-section">
    <div className="recent-header">
      <Calendar size={14} className="recent-icon" />
      <span>Últimas sesiones</span>
    </div>
    <div className="recent-list">
      {recent.map((w, i) => (
        <div 
  key={i}
  className="recent-card"
  onClick={() => onOpenWorkout(w)}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer"
  }}
>
          <div className="recent-card-left">
            <span className="recent-day">{w.day}</span>
            <span className="recent-date">{w.date}</span>
          </div>
          <div className="recent-cats">
            {w.categories.map((c) => (
              <span key={c} className="cat-badge">{c}</span>
            ))}
          </div>
          {/* Botón de eliminar */}
          {/* Botón de eliminar */}
          <button 
            onClick={(e) => {
  e.stopPropagation();
  deleteWorkout(w.timestamp);
  window.location.reload();
}}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff4d4d' }}
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  </div>
)}

      {recent.length === 0 && (
        <div className="empty-state">
          <p>Aún no hay sesiones guardadas.</p>
          <p>¡Comienza hoy!</p>
        </div>
      )}
    </div>
  );
}