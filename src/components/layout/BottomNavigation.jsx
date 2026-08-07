import { BarChart3, Dumbbell, Home, UserRound } from "lucide-react";

const ITEMS = [
  { id: "dashboards", label: "Inicio", icon: Home },
  { id: "workout", label: "Entrenar", icon: Dumbbell, action: true },
  { id: "progress", label: "Progreso", icon: BarChart3 },
  { id: "profile", label: "Perfil", icon: UserRound },
];

export default function BottomNavigation({ currentView, onNavigate, onStart }) {
  return (
    <nav className="bottom-navigation" aria-label="Navegación principal móvil">
      <div className="bottom-navigation__inner">
        {ITEMS.map(({ id, label, icon: Icon, action }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              type="button"
              className={`bottom-navigation__item ${action ? "bottom-navigation__item--action" : ""} ${active ? "is-active" : ""}`}
              onClick={action ? onStart : () => onNavigate(id)}
              aria-current={active ? "page" : undefined}
            >
              <span className="bottom-navigation__icon">
                <Icon size={action ? 21 : 20} strokeWidth={action ? 2.5 : 2.1} />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
