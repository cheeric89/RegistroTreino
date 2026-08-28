import { useEffect, useState } from "react";
import { BarChart3, Scale, Trophy } from "lucide-react";
import ProgressView from "./profile/ProgressView";
import BodyNutritionView from "./profile/BodyNutritionView";
import PRsView from "./profile/PRsView";

const TABS = [
  { id: "training", label: "Rendimiento", icon: BarChart3 },
  { id: "body", label: "Cuerpo", icon: Scale },
  { id: "records", label: "Récords", icon: Trophy },
];

export default function ProgressPage({ initialTab = "training" }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => setTab(initialTab), [initialTab]);

  return (
    <div className="page-shell progress-page simplified-section-page">
      <header className="simplified-page-heading">
        <div>
          <span>Tu evolución</span>
          <h1>Progreso</h1>
          <p>Todo lo que necesitas para ver si estás avanzando.</p>
        </div>
      </header>

      <nav className="simplified-tabs" aria-label="Secciones de progreso">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "is-active" : ""}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="progress-page__content">
        {tab === "training" && <ProgressView />}
        {tab === "body" && (
          <div className="progress-body-view">
            <BodyNutritionView initialMode="body" />
          </div>
        )}
        {tab === "records" && <PRsView />}
      </div>
    </div>
  );
}
