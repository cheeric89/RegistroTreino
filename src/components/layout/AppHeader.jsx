import { BarChart3, Dumbbell, Home, User, Utensils } from "lucide-react";
import BrandLogo from "./BrandLogo";

const NAV_ITEMS = [
  { id: "dashboards", label: "Inicio", icon: Home },
  { id: "workout", label: "Entrenar", icon: Dumbbell, action: true },
  { id: "nutrition", label: "Nutrición", icon: Utensils },
  { id: "progress", label: "Progreso", icon: BarChart3 },
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

export default function AppHeader({ currentView, onNavigate, onStart, user, profile }) {
  return (
    <header className="app-shell-header app-shell-header--simple">
      <div className="app-shell-header__inner">
        <button type="button" className="brand-button" onClick={() => onNavigate("dashboards")} aria-label="Ir al inicio">
          <BrandLogo compact />
        </button>

        <nav className="desktop-navigation" aria-label="Navegación principal">
          {NAV_ITEMS.map(({ id, label, icon: Icon, action }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                type="button"
                className={`desktop-navigation__item ${active ? "is-active" : ""}`}
                onClick={action ? onStart : () => onNavigate(id)}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <button type="button" className="header-profile-button header-profile-button--simple" onClick={() => onNavigate("profile")} aria-label="Abrir perfil">
          <span className="header-profile-button__avatar">{getInitials(profile, user)}</span>
          <span className="header-profile-button__copy">
            <strong>{profile?.alias || "Perfil"}</strong>
          </span>
          <User size={16} className="header-profile-button__user-icon" />
        </button>
      </div>
    </header>
  );
}
