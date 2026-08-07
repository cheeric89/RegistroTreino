import { BarChart3, Home, UserRound } from "lucide-react";
import BrandLogo from "./BrandLogo";

const NAV_ITEMS = [
  { id: "dashboards", label: "Inicio", icon: Home },
  { id: "progress", label: "Progreso", icon: BarChart3 },
  { id: "profile", label: "Perfil", icon: UserRound },
];

const getInitials = (profile, user) => {
  const source = profile?.alias || user?.email?.split("@")[0] || "T";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export default function AppHeader({ currentView, onNavigate, user, profile }) {
  return (
    <header className="app-shell-header">
      <div className="app-shell-header__inner">
        <button
          type="button"
          className="brand-button"
          onClick={() => onNavigate("dashboards")}
          aria-label="Ir al inicio"
        >
          <BrandLogo compact />
        </button>

        <nav className="desktop-navigation" aria-label="Navegación principal">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                type="button"
                className={`desktop-navigation__item ${active ? "is-active" : ""}`}
                onClick={() => onNavigate(id)}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className="header-avatar"
          onClick={() => onNavigate("profile")}
          aria-label="Abrir perfil"
        >
          {getInitials(profile, user)}
        </button>
      </div>
    </header>
  );
}
