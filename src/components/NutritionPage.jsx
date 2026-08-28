import { Utensils } from "lucide-react";
import BodyNutritionView from "./profile/BodyNutritionView";

export default function NutritionPage() {
  return (
    <div className="page-shell nutrition-page simplified-section-page">
      <header className="simplified-page-heading">
        <div>
          <span>Hoy</span>
          <h1>Nutrición</h1>
          <p>Registra lo que comes y sigue tu objetivo del día.</p>
        </div>
        <div className="simplified-page-heading__icon" aria-hidden="true">
          <Utensils size={22} />
        </div>
      </header>

      <div className="nutrition-page__content">
        <BodyNutritionView initialMode="nutrition" />
      </div>
    </div>
  );
}
