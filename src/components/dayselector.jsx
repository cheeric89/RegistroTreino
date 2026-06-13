// DaySelector.jsx — Selección del día de entrenamiento
// Para extender: resaltar los días que ya tienen sesiones guardadas,
// o agregar un indicador de "músculo más trabajado" por día.

import { ChevronLeft } from "lucide-react";

const DAYS = [
  { label: "Lunes", short: "LUN", num: "01" },
  { label: "Martes", short: "MAR", num: "02" },
  { label: "Miércoles", short: "MIÉ", num: "03" },
  { label: "Jueves", short: "JUE", num: "04" },
  { label: "Viernes", short: "VIE", num: "05" },
  { label: "Sábado", short: "SÁB", num: "06" },
  { label: "Domingo", short: "DOM", num: "07" },
];

export default function DaySelector({ onSelect, onBack }) {
  const today = new Date().getDay(); // 0=Dom, 1=Lun...
  // Mapear el índice JS al índice de nuestra lista (Lun=0)
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <div className="screen">
      {/* Top bar */}
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Paso 1 de 3</span>
          <h2>¿Qué día entrenas?</h2>
        </div>
      </div>

      <p className="screen-subtitle">
        Selecciona el día de tu sesión
      </p>

      {/* Lista de días */}
      <div className="day-list">
        {DAYS.map((day, i) => {
          const isToday = i === todayIndex;
          return (
            <button
              key={day.label}
              className={`day-card ${isToday ? "day-card--today" : ""}`}
              onClick={() => onSelect(day.label)}
            >
              <span className="day-num">{day.num}</span>
              <span className="day-label">{day.label}</span>
              {isToday && <span className="today-badge">Hoy</span>}
              <ChevronLeft size={16} className="day-arrow" style={{ transform: "rotate(180deg)" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}