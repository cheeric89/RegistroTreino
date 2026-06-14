// src/components/ExerciseHint.jsx
// Tarjeta de sugerencia de sobrecarga progresiva
// Se renderiza debajo del nombre de cada ejercicio en WorkoutForm
// Es un componente puro: solo recibe props, no tiene estado ni side-effects

import React from "react";
import { TrendingUp, Sparkles, Star } from "lucide-react";

/**
 * @param {{ hint: ReturnType<import('../utils/progressionEngine').getProgressionHint> }} props
 */
export default function ExerciseHint({ hint }) {
  // No renderizar si no hay hint relevante
  if (!hint || hint.type === null) return null;

  if (hint.type === "first_time") {
    return (
      <div className="ex-hint ex-hint--first">
        <Star size={13} className="ex-hint-icon" />
        <span className="ex-hint-text">{hint.message}</span>
      </div>
    );
  }

  if (hint.type === "suggestion") {
    return (
      <div className="ex-hint ex-hint--suggestion">
        <TrendingUp size={13} className="ex-hint-icon" />
        <span className="ex-hint-text">{hint.message}</span>
      </div>
    );
  }

  return null;
}

/**
 * Insignia de PR — aparece al guardar cuando hay mejora.
 * Se pasa isVisible desde WorkoutForm tras la detección.
 */
export function PRBadge({ exerciseName, status }) {
  if (!status?.isPR) return null;

  return (
    <div className="pr-badge" role="status" aria-live="polite">
      <span className="pr-badge-fire">🔥</span>
      <div className="pr-badge-body">
        <span className="pr-badge-title">¡Nuevo récord!</span>
        <span className="pr-badge-name">{exerciseName}</span>
        {status.volumeDelta > 0 && (
          <span className="pr-badge-delta">+{status.volumeDelta} kg·reps de volumen</span>
        )}
      </div>
    </div>
  );
}
