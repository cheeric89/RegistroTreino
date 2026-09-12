import { useEffect, useState } from "react";

export default function SyncStatus({ busy = false, error = null, pending = 0, className = "" }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const state = !online ? "offline" : busy ? "busy" : pending ? "pending" : error ? "error" : "ready";
  const labels = { offline: "Sin conexión", busy: "Sincronizando…", pending: "Pendiente", error: "Revisar conexión", ready: "Al día" };
  const detail = pending
    ? "Hay cambios guardados en este dispositivo pendientes de sincronizar."
    : error ? "No pudimos comprobar la sincronización. Inténtalo cuando tengas conexión."
      : labels[state];
  return <small className={`sync-status sync-status--${state} ${className}`} role="status" aria-live="polite" aria-label={`${labels[state]}. ${detail}`} title={detail}>{labels[state]}</small>;
}
