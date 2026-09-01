import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Dumbbell, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

const GOALS = [
  { value: "muscle_gain", label: "Ganar músculo" },
  { value: "fat_loss", label: "Perder grasa" },
  { value: "strength", label: "Ganar fuerza" },
  { value: "recomp", label: "Recomposición" },
  { value: "maintain", label: "Mantener" },
];

const dismissalKey = (userId) => `treino_onboarding_dismissed:${userId || "guest"}`;

const wasDismissed = (userId) => {
  try {
    return localStorage.getItem(dismissalKey(userId)) === "1";
  } catch {
    return false;
  }
};

const dismiss = (userId) => {
  try {
    localStorage.setItem(dismissalKey(userId), "1");
  } catch {
    // El onboarding sigue siendo usable aunque localStorage no esté disponible.
  }
};

const isIncompleteProfile = (profile) => {
  if (!profile) return true;
  return !profile.alias?.trim()
    && !profile.training_goal
    && !profile.weight_kg
    && !profile.height_cm;
};

export default function WelcomeSetup({ user, profile, loading, saving, onSave }) {
  const [hidden, setHidden] = useState(() => wasDismissed(user?.id));
  const [form, setForm] = useState({
    alias: "",
    training_goal: "muscle_gain",
    weight_kg: "",
    height_cm: "",
    weekly_training_goal: 4,
  });

  useEffect(() => {
    setHidden(wasDismissed(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!profile) return;
    setForm((current) => ({
      ...current,
      alias: profile.alias || "",
      training_goal: profile.training_goal || current.training_goal,
      weight_kg: profile.weight_kg ?? "",
      height_cm: profile.height_cm ?? "",
      weekly_training_goal: profile.weekly_training_goal ?? current.weekly_training_goal,
    }));
  }, [profile]);

  const shouldShow = useMemo(
    () => Boolean(user && !loading && !hidden && isIncompleteProfile(profile)),
    [user, loading, hidden, profile]
  );

  if (!shouldShow) return null;

  const handleDismiss = () => {
    dismiss(user?.id);
    setHidden(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.alias.trim()) {
      toast.info("Escribe cómo quieres que te llamemos");
      return;
    }

    const result = await onSave({
      alias: form.alias.trim(),
      training_goal: form.training_goal,
      weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
      height_cm: form.height_cm === "" ? null : Number(form.height_cm),
      weekly_training_goal: Math.min(7, Math.max(1, Number(form.weekly_training_goal) || 4)),
      activity_level: profile?.activity_level || "moderate",
      weight_trend: profile?.weight_trend || "unknown",
    });

    if (result?.error) {
      toast.warning("Guardamos tus datos localmente; se sincronizarán al reconectar");
      return;
    }

    dismiss(user?.id);
    setHidden(true);
    toast.success("Treino quedó listo para ti");
  };

  return (
    <div className="welcome-setup-backdrop" role="presentation">
      <form className="welcome-setup" onSubmit={handleSave}>
        <button type="button" className="welcome-setup__close" onClick={handleDismiss} aria-label="Configurar más tarde">
          <X size={18} />
        </button>

        <div className="welcome-setup__icon"><Sparkles size={22} /></div>
        <span className="welcome-setup__eyebrow">Bienvenido a Treino</span>
        <h2>Déjalo listo en menos de un minuto.</h2>
        <p>Solo necesitamos lo esencial. Todo lo demás lo puedes completar después.</p>

        <label className="welcome-setup__field welcome-setup__field--wide">
          <span>¿Cómo quieres que te llamemos?</span>
          <input
            autoFocus
            value={form.alias}
            onChange={(event) => setForm((current) => ({ ...current, alias: event.target.value }))}
            placeholder="Tu nombre o alias"
            maxLength={32}
          />
        </label>

        <fieldset className="welcome-setup__goals">
          <legend>Tu objetivo principal</legend>
          <div>
            {GOALS.map((goal) => (
              <button
                key={goal.value}
                type="button"
                className={form.training_goal === goal.value ? "is-selected" : ""}
                onClick={() => setForm((current) => ({ ...current, training_goal: goal.value }))}
              >
                {form.training_goal === goal.value && <Check size={14} />}
                {goal.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="welcome-setup__optional">
          <label className="welcome-setup__field">
            <span>Peso <small>opcional</small></span>
            <div><input type="number" min="20" max="400" step="0.1" inputMode="decimal" value={form.weight_kg} onChange={(event) => setForm((current) => ({ ...current, weight_kg: event.target.value }))} placeholder="70" /><b>kg</b></div>
          </label>
          <label className="welcome-setup__field">
            <span>Altura <small>opcional</small></span>
            <div><input type="number" min="100" max="250" inputMode="numeric" value={form.height_cm} onChange={(event) => setForm((current) => ({ ...current, height_cm: event.target.value }))} placeholder="175" /><b>cm</b></div>
          </label>
          <label className="welcome-setup__field">
            <span>Entrenos / semana</span>
            <div><Dumbbell size={15} /><input type="number" min="1" max="7" inputMode="numeric" value={form.weekly_training_goal} onChange={(event) => setForm((current) => ({ ...current, weekly_training_goal: event.target.value }))} /></div>
          </label>
        </div>

        <div className="welcome-setup__actions">
          <button type="button" onClick={handleDismiss}>Ahora no</button>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Empezar"}
            {!saving && <ArrowRight size={17} />}
          </button>
        </div>
      </form>
    </div>
  );
}
