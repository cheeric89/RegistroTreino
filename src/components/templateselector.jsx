import { ChevronLeft, ChevronRight } from "lucide-react";
import * as TemplateData from "../data/routineTemplates";

export default function TemplateSelector({ onSelect, onBack }) {
  const templates =
    TemplateData.ROUTINE_TEMPLATES ||
    TemplateData.routineTemplates ||
    TemplateData.default ||
    [];

  return (
    <div className="screen flow-screen">
      <div className="topbar">
        <button type="button" className="back-btn" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <div className="topbar-title">
          <span className="step-label">Nuevo entrenamiento</span>
          <h2>Elige una rutina</h2>
        </div>
      </div>

      <p className="screen-subtitle">
        Selecciona una plantilla o crea tu propia sesión.
      </p>

      <div className="day-list template-list">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="day-card template-card"
            onClick={() => onSelect(template)}
          >
            <span className="template-card__icon" aria-hidden="true">
              {template.emoji || "💪"}
            </span>
            <span className="template-card__copy">
              <span className="day-label">{template.label}</span>
              <span className="template-card__description">{template.description}</span>
            </span>
            <ChevronRight size={17} className="day-arrow" />
          </button>
        ))}
      </div>
    </div>
  );
}
