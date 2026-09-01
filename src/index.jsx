import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import { RoutineProvider } from "./contexts/RoutineContext";
import "./utils/barcodeDetectorPolyfill";
import App from "./app";
import "./styles.css";
import "./styles/portfolio-core.css";
import "./styles/portfolio-dashboard.css";
import "./styles/portfolio-smart-dashboard.css";
import "./styles/portfolio-account.css";
import "./styles/portfolio-workout.css";
import "./styles/portfolio-fixes.css";
import "./styles/portfolio-records.css";
import "./styles/portfolio-history.css";
import "./styles/portfolio-sync.css";
import "./styles/portfolio-summary.css";
import "./styles/portfolio-exercise-progress.css";
import "./styles/portfolio-exercise-insights.css";
import "./styles/portfolio-routines.css";
import "./styles/portfolio-smart-progression.css";
import "./styles/portfolio-smart-platform.css";
import "./styles/portfolio-coaching-planning.css";
import "./styles/portfolio-nutrition-body.css";
import "./styles/portfolio-meal-logger.css";
import "./styles/portfolio-custom-recipes.css";
import "./styles/portfolio-daily-experience.css";
import "./styles/portfolio-routine-launch.css";
import "./styles/portfolio-workout-editor.css";
import "./styles/portfolio-simplified-ux.css";
import "./styles/portfolio-polish-1-6-1.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <WorkoutProvider>
          <RoutineProvider>
            <Toaster
              position="top-center"
              className="treino-toaster"
              richColors
              closeButton
            />
            <App />
          </RoutineProvider>
        </WorkoutProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[Treino] Service Worker no disponible:", error?.message || error);
    });
  });
}
