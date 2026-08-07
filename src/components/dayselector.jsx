import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <div className="screen flow-screen">
      <div className="topbar">
        <button type="button" className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Paso 1 de 3</span>
          <h2>¿Qué día entrenas?</h2>
        </div>
      </div>

      <p className="screen-subtitle">Selecciona el día de tu sesión.</p>

      <div className="day-list">
        {DAYS.map((day, index) => {
          const isToday = index === todayIndex;
          return (
            <button
              key={day.label}
              type="button"
              className={`day-card ${isToday ? "day-card--today" : ""}`}
              onClick={() => onSelect(day.label)}
            >
              <span className="day-num">{day.num}</span>
              <span className="day-label">{day.label}</span>
              {isToday && <span className="today-badge">Hoy</span>}
              <ChevronRight size={16} className="day-arrow" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
