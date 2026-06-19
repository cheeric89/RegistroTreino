import { useState, useEffect, useRef } from "react";
import { Minus, Plus, Timer } from "lucide-react";
import { useProfile } from "../../hooks/useProfile";

export default function SettingsView() {
  const { profile, saveProfile } = useProfile();

const [restTime, setRestTime] = useState(120);
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);
const isFirstLoad = useRef(true);
useEffect(() => {
  if (profile?.rest_time_seconds) {
    setRestTime(profile.rest_time_seconds);
  }
}, [profile]);
useEffect(() => {
  if (isFirstLoad.current) {
    isFirstLoad.current = false;
    return;
  }

  setSaving(true);
setSaved(false);

const timer = setTimeout(async () => {
  const { error } = await saveProfile({
    rest_time_seconds: restTime,
  });

  setSaving(false);

  if (!error) {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2000);
  }
}, 1000);

  return () => clearTimeout(timer);
}, [restTime]);

  const decreaseTime = () => {
    setRestTime((prev) => Math.max(30, prev - 30));
  };

  const increaseTime = () => {
    setRestTime((prev) => Math.min(600, prev + 30));
  };

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");

    return `${mins}:${secs}`;
  };

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      }}
    >
      <div
        style={{
          background: "#1e1e24",
          border: "1px solid #333",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
            fontSize: "1rem",
            fontWeight: "600",
          }}
        >
          <Timer size={18} color="#a855f7" />
          Tiempo de descanso
        </div>

        <p
          style={{
            color: "#888",
            fontSize: "0.9rem",
            marginBottom: "20px",
          }}
        >
          Este será tu descanso predeterminado entre series.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <button
            onClick={decreaseTime}
            style={buttonStyle}
          >
            <Minus size={18} />
          </button>

          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              minWidth: "90px",
              textAlign: "center",
            }}
          >
            {formatTime(restTime)}
          </div>


          <button
            onClick={increaseTime}
            style={buttonStyle}
          >
            <Plus size={18} />
          </button>
        </div>
        <div
  style={{
    textAlign: "center",
    marginTop: "15px",
    height: "20px",
    fontSize: "0.85rem",
    color: "#a855f7",
    fontWeight: "600",
  }}
>
  {saving && "Guardando..."}
  {!saving && saved && "✓ Guardado"}
</div>
      </div>
    </div>
  );
}


const buttonStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  border: "none",
  background: "#7c3aed",
  color: "white",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
};