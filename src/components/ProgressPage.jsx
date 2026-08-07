import { BarChart3 } from "lucide-react";
import ProgressView from "./profile/ProgressView";

export default function ProgressPage() {
  return (
    <div className="page-shell progress-page">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">Tu rendimiento</span>
          <h1>Progreso</h1>
          <p>Una vista clara de tu constancia, volumen y evolución.</p>
        </div>
        <div className="page-heading__icon" aria-hidden="true">
          <BarChart3 size={24} />
        </div>
      </header>

      <ProgressView />
    </div>
  );
}
