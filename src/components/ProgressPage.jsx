import { useEffect, useState } from "react";
import { BarChart3, CalendarRange, Scale, Trophy } from "lucide-react";
import WeeklyInsights from "./WeeklyInsights";
import ProgressView from "./profile/ProgressView";
import BodyNutritionView from "./profile/BodyNutritionView";
import PRsView from "./profile/PRsView";

const TABS = [
  { id: "week", label: "Semana", icon: CalendarRange },
  { id: "training", label: "Rendimiento", icon: BarChart3 },
  { id: "body", label: "Cuerpo", icon: Scale },
  { id: "records", label: "Récords", icon: Trophy },
];

const resolveInitialTab = (value) => {
  if (value === "body" || value === "records") return value;
  return "week";
};

export default function ProgressPage({ initialTab = "week" }) {
  const [tab, setTab] = useState(() => resolveInitialTab(initialTab));

  useEffect(() => setTab(resolveInitialTab(initialTab)), [initialTab]);

  return (
    <div className="page-shell progress-page simplified-section-page progress-page--v17">
      <header className="simplified-page-heading">
        <div>
          <span>Tu evolución</span>
          <h1>Progreso</h1>
          <p>Primero la semana. Los detalles siguen a un toque.</p>
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
        {tab === "week" && <WeeklyInsights />}
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
