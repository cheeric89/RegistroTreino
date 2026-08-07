import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import App from "./app";
import "./styles.css";
import "./styles/portfolio-core.css";
import "./styles/portfolio-dashboard.css";
import "./styles/portfolio-account.css";
import "./styles/portfolio-workout.css";
import "./styles/portfolio-fixes.css";
import "./styles/portfolio-records.css";
import "./styles/portfolio-history.css";
import "./styles/portfolio-sync.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <WorkoutProvider>
          <Toaster
            position="top-center"
            className="treino-toaster"
            richColors
            closeButton
          />
          <App />
        </WorkoutProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
