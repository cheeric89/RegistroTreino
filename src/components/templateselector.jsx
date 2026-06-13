// src/components/templateselector.jsx
import React from 'react';
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as TemplateData from "../data/routineTemplates";

export default function TemplateSelector({ onSelect, onBack }) {
  // Busca la información en mayúsculas, minúsculas o exportación por defecto
  const templates = 
    TemplateData.ROUTINE_TEMPLATES || 
    TemplateData.routineTemplates || 
    TemplateData.default || 
    [];

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Nuevo entrenamiento</span>
          <h2>Elige una rutina</h2>
        </div>
      </div>

      <p className="screen-subtitle">
        Selecciona una plantilla o crea tu propia sesión
      </p>

      <div className="day-list">
        {templates.map((t) => (
          <button
            key={t.id}
            className="day-card"
            onClick={() => onSelect(t)}
          >
            <span style={{ fontSize: 22 }}>{t.emoji || "💪"}</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div className="day-label">{t.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                {t.description}
              </div>
            </div>
            <ChevronRight size={16} className="day-arrow" />
          </button>
        ))}
      </div>
    </div>
  );
}