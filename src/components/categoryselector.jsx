// CategorySelector.jsx — Selección de grupos musculares (máx. 3)
// Para extender: agregar íconos SVG de anatomía para cada músculo,
// o mostrar cuándo fue la última vez que entrenaste ese grupo.

import { useState } from "react";
import { ChevronLeft, Check, AlertCircle } from "lucide-react";

const MAX_CATS = 3;

// Para extender: añade más categorías aquí con su emoji o ícono
const CATEGORIES = [
  { id: "pecho", label: "Pecho", emoji: "💪" },
  { id: "espalda", label: "Espalda", emoji: "🏋️" },
  { id: "biceps", label: "Bíceps", emoji: "💪" },
  { id: "triceps", label: "Tríceps", emoji: "🤜" },
  { id: "hombro", label: "Hombro", emoji: "⚡" },
  { id: "antebrazo", label: "Antebrazo", emoji: "🦾" },
  { id: "pierna", label: "Pierna", emoji: "🦵" },
  { id: "abdomen", label: "Abdomen", emoji: "🎯" },
];

export default function CategorySelector({ day, onConfirm, onBack }) {
  const [selected, setSelected] = useState([]);
  const atMax = selected.length >= MAX_CATS;

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (!atMax) {
      setSelected([...selected, id]);
    }
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    onConfirm(selected.map((id) => CATEGORIES.find((c) => c.id === id).label));
  };

  return (
    <div className="screen">
      {/* Top bar */}
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Paso 2 de 3 · {day}</span>
          <h2>Grupos musculares</h2>
        </div>
      </div>

      {/* Contador */}
      <div className={`counter-bar ${atMax ? "counter-bar--full" : ""}`}>
        {atMax ? (
          <>
            <Check size={14} className="counter-icon" />
            <span>Máximo alcanzado (3/3)</span>
          </>
        ) : (
          <>
            <AlertCircle size={14} className="counter-icon" />
            <span>
              Selecciona hasta {MAX_CATS} grupos · {selected.length}/{MAX_CATS}
            </span>
          </>
        )}
      </div>

      {/* Grid de categorías */}
      <div className="cat-grid">
        {CATEGORIES.map((cat) => {
          const isSelected = selected.includes(cat.id);
          const isDisabled = atMax && !isSelected;
          return (
            <button
              key={cat.id}
              className={`cat-card ${isSelected ? "cat-card--selected" : ""} ${isDisabled ? "cat-card--disabled" : ""}`}
              onClick={() => toggle(cat.id)}
              disabled={isDisabled}
            >
              {isSelected && (
                <div className="cat-check">
                  <Check size={11} strokeWidth={3} />
                </div>
              )}
              <span className="cat-emoji">{cat.emoji}</span>
              <span className="cat-name">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Confirmar */}
      <div className="sticky-footer">
        <button
          className={`cta-button ${selected.length === 0 ? "cta-button--disabled" : ""}`}
          onClick={handleConfirm}
          disabled={selected.length === 0}
        >
          Continuar
          {selected.length > 0 && (
            <span className="cta-badge">{selected.length}</span>
          )}
        </button>
      </div>
    </div>
  );
}