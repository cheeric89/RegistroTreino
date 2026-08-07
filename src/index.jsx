import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./app";
import "./styles.css";
import "./styles/portfolio-core.css";
import "./styles/portfolio-dashboard.css";
import "./styles/portfolio-account.css";
import "./styles/portfolio-workout.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-center"
          className="treino-toaster"
          richColors
          closeButton
        />
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
