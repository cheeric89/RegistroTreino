import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Timer } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";

export default function SettingsView() {
  const { profile, saveProfile } = useProfile();
  const [restTime, setRestTime] = useState(120);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (profile?.rest_time_seconds) {
      setRestTime(profile.rest_time_seconds);
    }
  }, [profile?.rest_time_seconds]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return undefined;
    }

    setSaving(true);
    setSaved(false);

    const timer = setTimeout(async () => {
      const { error } = await saveProfile({ rest_time_seconds: restTime });
      setSaving(false);
      if (!error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [restTime]);

  const formatTime = (seconds) => {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const remainder = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  };

  return (
    <section className="settings-card">
      <div className="settings-card__header">
        <span className="settings-card__icon">
          <Timer size={20} />
        </span>
        <div>
          <span className="card-kicker">Temporizador</span>
          <h2>Tiempo de descanso</h2>
        </div>
      </div>

      <p className="settings-card__description">
        Este será el descanso predeterminado que Treino iniciará entre tus series.
      </p>

      <div className="rest-time-control">
        <button
          type="button"
          onClick={() => setRestTime((current) => Math.max(30, current - 30))}
          disabled={restTime <= 30}
          aria-label="Reducir 30 segundos"
        >
          <Minus size={19} />
        </button>
        <div className="rest-time-control__value">
          <strong>{formatTime(restTime)}</strong>
          <span>minutos</span>
        </div>
        <button
          type="button"
          onClick={() => setRestTime((current) => Math.min(600, current + 30))}
          disabled={restTime >= 600}
          aria-label="Aumentar 30 segundos"
        >
          <Plus size={19} />
        </button>
      </div>

      <div className="settings-save-status" role="status" aria-live="polite">
        {saving && "Guardando cambios..."}
        {!saving && saved && "✓ Preferencia guardada"}
      </div>
    </section>
  );
}
