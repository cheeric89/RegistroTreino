// src/components/profile/ProfileView.jsx
import { useState, useEffect, useCallback } from "react";
import { 
  ChevronLeft, 
  User, 
  Trophy, 
  LineChart, 
  Settings,
  Edit3, 
  Save, 
  X, 
  LogOut 
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useProfile } from "../../hooks/useProfile";
import { supabase } from "../../lib/supabase";
import PRsView from "./PRsView";
import ProgressView from "./ProgressView";
import SettingsView from "./SettingsView";

// --- ESTILOS TREINO ---
const btnStyle = {
  background: "#7c3aed", color: "white", border: "none", padding: "12px 24px",
  borderRadius: "30px", cursor: "pointer", fontWeight: "600", fontSize: "0.95rem",
  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)", transition: "all 0.2s", width: "100%"
};
const secondaryBtnStyle = { ...btnStyle, background: "#1e1e24", border: "1px solid #333", boxShadow: "none" };
const dangerBtnStyle = { ...secondaryBtnStyle, color: "#ef4444", border: "1px solid #ef4444" };
const inputStyle = { background: "#1e1e24", border: "1px solid #333", borderRadius: "12px", padding: "12px", color: "white", width: "100%" };
const tabStyle = (isActive) => ({
  background: isActive ? "#7c3aed" : "#1e1e24", color: "white", border: "none",
  padding: "8px 16px", borderRadius: "20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem"
});

const TABS = [
  { id: "overview", label: "Perfil", icon: User },
  { id: "prs", label: "Récords", icon: Trophy },
  { id: "progress", label: "Progreso", icon: LineChart },
  { id: "settings", label: "Ajustes", icon: Settings },
];

export default function ProfileView({ initialTab = "overview", onBack }) {
  const { user, logout } = useAuth();
  const { profile, loading, saving, saveProfile } = useProfile();
  const [tab, setTab] = useState(initialTab);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ alias: "", weight_kg: "", height_cm: "" });

  useEffect(() => {
    if (profile) setForm({ alias: profile.alias || "", weight_kg: profile.weight_kg ?? "", height_cm: profile.height_cm ?? "" });
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveProfile({ alias: form.alias.trim() || null, weight_kg: form.weight_kg !== "" ? parseFloat(form.weight_kg) : null, height_cm: form.height_cm !== "" ? parseFloat(form.height_cm) : null });
    toast.success("Perfil actualizado");
    setEditing(false);
  };

  const bmi = form.weight_kg && form.height_cm ? (parseFloat(form.weight_kg) / Math.pow(parseFloat(form.height_cm) / 100, 2)).toFixed(1) : "—";

  return (
    <div className="screen">
      <div className="topbar">
        <button type="button" className="back-btn" onClick={onBack}><ChevronLeft size={20} /></button>
        <div className="topbar-title"><h2>Mi Perfil</h2></div>
      </div>

      <div style={{ display: "flex", gap: "8px", padding: "10px 20px" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} style={tabStyle(tab === id)} onClick={() => setTab(id)}><Icon size={14} /> {label}</button>
        ))}
      </div>

      <div className="form-scroll" style={{ padding: "20px" }}>
        {tab === "overview" && (
          loading ? <p>Cargando...</p> : <>
            {!editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ background: "#1e1e24", padding: "20px", borderRadius: "16px" }}>
                  <h3 style={{ margin: "0 0 5px" }}>{profile?.alias || "Atleta"}</h3>
                  <p style={{ color: "#888", margin: 0 }}>{user?.email}</p>
                  <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div><div style={{ color: "#888", fontSize: "0.8rem" }}>Peso</div>{profile?.weight_kg || "—"}kg</div>
                    <div><div style={{ color: "#888", fontSize: "0.8rem" }}>Altura</div>{profile?.height_cm || "—"}cm</div>
                    <div><div style={{ color: "#888", fontSize: "0.8rem" }}>IMC</div>{bmi}</div>
                  </div>
                </div>
                <button style={btnStyle} onClick={() => setEditing(true)}><Edit3 size={16}/> Editar datos personales</button>
                <button style={secondaryBtnStyle} onClick={logout}><LogOut size={16}/> Cerrar sesión</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input style={inputStyle} value={form.alias} onChange={(e) => setForm({...form, alias: e.target.value})} placeholder="Alias" />
                <input style={inputStyle} type="number" value={form.weight_kg} onChange={(e) => setForm({...form, weight_kg: e.target.value})} placeholder="Peso (kg)" />
                <input style={inputStyle} type="number" value={form.height_cm} onChange={(e) => setForm({...form, height_cm: e.target.value})} placeholder="Altura (cm)" />
                <button type="submit" style={btnStyle}><Save size={16}/> Guardar cambios</button>
                <button type="button" style={secondaryBtnStyle} onClick={() => setEditing(false)}><X size={16}/> Cancelar</button>
              </form>
            )}
          </>
        )}
        {tab === "prs" && <PRsView />}
        {tab === "progress" && <ProgressView />}
        {tab === "settings" && <SettingsView />}
      </div>
    </div>
  );
}