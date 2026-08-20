import { useEffect, useState } from "react";
import {
  Activity,
  Edit3,
  LogOut,
  Save,
  Settings,
  Target,
  Trophy,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useProfile } from "../../hooks/useProfile";
import BodyNutritionView from "./BodyNutritionView";
import GoalsView from "./GoalsView";
import PRsView from "./PRsView";
import SettingsView from "./SettingsView";

const TABS = [
  { id: "overview", label: "Perfil", icon: User },
  { id: "goals", label: "Objetivos", icon: Target },
  { id: "body", label: "Cuerpo & Nutrición", icon: Activity },
  { id: "prs", label: "Récords", icon: Trophy },
  { id: "settings", label: "Ajustes", icon: Settings },
];

const getInitials = (profile, user) => {
  const source = profile?.alias || user?.email?.split("@")[0] || "Atleta";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export default function ProfileView({ initialTab = "overview" }) {
  const { user, logout } = useAuth();
  const { profile, loading, saving, saveProfile } = useProfile();
  const [tab, setTab] = useState(initialTab);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ alias: "", weight_kg: "", height_cm: "" });

  useEffect(() => {
    if (!profile) return;
    setForm({
      alias: profile.alias || "",
      weight_kg: profile.weight_kg ?? "",
      height_cm: profile.height_cm ?? "",
    });
  }, [profile]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { error } = await saveProfile({
      alias: form.alias.trim() || null,
      weight_kg: form.weight_kg !== "" ? Number(form.weight_kg) : null,
      height_cm: form.height_cm !== "" ? Number(form.height_cm) : null,
    });

    if (error) {
      toast.error("No se pudo actualizar el perfil");
      return;
    }

    toast.success("Perfil actualizado");
    setEditing(false);
  };

  const handleLogout = async () => {
    const { error } = await logout();
    if (error) toast.error("No se pudo cerrar la sesión");
  };

  const weight = Number(profile?.weight_kg || form.weight_kg);
  const height = Number(profile?.height_cm || form.height_cm);
  const bmi = weight > 0 && height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(1) : "—";

  return (
    <div className="page-shell profile-page">
      <header className="page-heading profile-heading">
        <div>
          <span className="page-eyebrow">Centro personal</span>
          <h1>Tu cuenta</h1>
          <p>Administra tus datos, objetivos, cuerpo, nutrición, récords y preferencias de entrenamiento.</p>
        </div>
        <div className="profile-heading__avatar" aria-hidden="true">{getInitials(profile, user)}</div>
      </header>

      <div className="profile-tabs" role="tablist" aria-label="Secciones del perfil">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`profile-tab ${tab === id ? "is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="profile-content">
        {tab === "overview" && (
          loading ? (
            <div className="profile-loading-card" aria-label="Cargando perfil"><span /><span /><span /></div>
          ) : !editing ? (
            <div className="profile-overview-grid">
              <section className="profile-identity-card">
                <div className="profile-identity-card__top">
                  <div className="profile-avatar-large">{getInitials(profile, user)}</div>
                  <div>
                    <span className="card-kicker">Atleta Treino</span>
                    <h2>{profile?.alias || "Atleta"}</h2>
                    <p>{user?.email}</p>
                  </div>
                </div>

                <div className="profile-metrics">
                  <div><span>Peso</span><strong>{profile?.weight_kg ? `${profile.weight_kg} kg` : "—"}</strong></div>
                  <div><span>Altura</span><strong>{profile?.height_cm ? `${profile.height_cm} cm` : "—"}</strong></div>
                  <div><span>IMC</span><strong>{bmi}</strong></div>
                </div>
              </section>

              <aside className="profile-actions-card">
                <span className="card-kicker">Datos personales</span>
                <h2>Mantén tu perfil actualizado</h2>
                <p>Estos datos alimentan tus métricas, objetivos y estimaciones opcionales de Nutrition & Body.</p>
                <button type="button" className="primary-action-button" onClick={() => setEditing(true)}><Edit3 size={17} /> Editar información</button>
                <button type="button" className="profile-logout-button" onClick={handleLogout}><LogOut size={17} /> Cerrar sesión</button>
              </aside>
            </div>
          ) : (
            <form className="profile-edit-card" onSubmit={handleSubmit}>
              <div className="section-heading section-heading--compact">
                <div><span className="card-kicker">Editar perfil</span><h2>Información personal</h2></div>
                <Edit3 size={20} />
              </div>

              <div className="profile-form-grid">
                <label className="profile-field profile-field--wide">
                  <span>Alias</span>
                  <input value={form.alias} onChange={(event) => setForm((current) => ({ ...current, alias: event.target.value }))} placeholder="Cómo quieres que te llamemos" />
                </label>
                <label className="profile-field">
                  <span>Peso (kg)</span>
                  <input type="number" inputMode="decimal" min="0" step="0.1" value={form.weight_kg} onChange={(event) => setForm((current) => ({ ...current, weight_kg: event.target.value }))} placeholder="70" />
                </label>
                <label className="profile-field">
                  <span>Altura (cm)</span>
                  <input type="number" inputMode="numeric" min="0" value={form.height_cm} onChange={(event) => setForm((current) => ({ ...current, height_cm: event.target.value }))} placeholder="175" />
                </label>
              </div>

              <div className="profile-edit-actions">
                <button type="button" className="dialog-button" onClick={() => setEditing(false)}><X size={17} /> Cancelar</button>
                <button type="submit" className="primary-action-button" disabled={saving}><Save size={17} /> {saving ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </form>
          )
        )}

        {tab === "goals" && <GoalsView />}
        {tab === "body" && <BodyNutritionView />}
        {tab === "prs" && <PRsView />}
        {tab === "settings" && <SettingsView />}
      </div>
    </div>
  );
}
