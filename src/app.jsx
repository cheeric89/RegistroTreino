// src/app.jsx
// Updated App — adds AUTH + PROGRESS views.
// All existing workout flow logic is UNTOUCHED.
// New: reads auth state to guard routes + adds PROGRESS view.

import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import AuthScreen from "./components/auth/AuthScreen"; // Asegúrate de importar tu componente


// ── Existing components (unchanged) ───────────────────────
import * as DashboardModule from "./components/dashboards";
const Dashboard = DashboardModule.Dashboard || DashboardModule.default || (() => null);
import DaySelector from "./components/dayselector";
import TemplateSelector from "./components/templateselector";
import CategorySelector from "./components/categoryselector";
import WorkoutForm from "./components/workoutform";
import WorkoutSummary from "./components/workoutsummary";

// ── Componentes temporales (Evitan que Vite explote mientras regresa Claude) ──


const ProgressScreen = ({ onBack }) => (
  <div style={{ color: "white", padding: "40px 20px", textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
    <h2 style={{ fontSize: "24px", marginBottom: "10px" }}>📈 Panel de Progreso</h2>
    <p style={{ color: "#aaa", marginBottom: "30px" }}>
      ¡Aquí Claude construirá tus gráficas de Recharts y el calendario de rachas en el Módulo 4!
    </p>
    <button 
      onClick={onBack} 
      style={{ background: "#374151", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "semibold" }}
    >
      Volver al Dashboard
    </button>
  </div>
);

const OnboardingModal = () => null;

// ── Views ──────────────────────────────────────────────────
const VIEWS = {
  AUTH: "auth",
  DASHBOARD: "dashboards",
  TEMPLATE_SELECTOR: "template_selector",
  DAY_SELECTOR: "day_selector",
  CATEGORY_SELECTOR: "category_selector",
  WORKOUT_FORM: "workout_form",
  SUMMARY: "summary",
  PROGRESS: "progress",
};

export default function App() {
  const { user, loading } = useAuth();

  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [isGuest, setIsGuest] = useState(false); // <-- Controla el acceso de invitado de forma segura
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [savedWorkout, setSavedWorkout] = useState(null);

  const navigate = (nextView) => setView(nextView);

  // ── Handlers ───────────────────────────────────────────
  const handleStart = () => navigate(VIEWS.TEMPLATE_SELECTOR);

  const handleTemplateSelected = (template) => {
    setSelectedTemplate(template);
    navigate(VIEWS.DAY_SELECTOR);
  };

  const handleDaySelected = (day) => {
    setSelectedDay(day);
    if (selectedTemplate && selectedTemplate.id !== "custom") {
      navigate(VIEWS.WORKOUT_FORM);
    } else {
      navigate(VIEWS.CATEGORY_SELECTOR);
    }
  };

  const handleCategoriesConfirmed = (cats) => {
    setSelectedCategories(cats);
    navigate(VIEWS.WORKOUT_FORM);
  };

  const handleWorkoutSaved = (workout) => {
    setSavedWorkout(workout);
    navigate(VIEWS.SUMMARY);
  };

  const handleReset = () => {
    setSelectedDay(null);
    setSelectedCategories([]);
    setSelectedTemplate(null);
    setSavedWorkout(null);
    navigate(VIEWS.DASHBOARD);
  };

  // ── Auth loading splash ────────────────────────────────
  if (loading) {
    return (
      <div className="app-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#121214" }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "3px solid #374151",
          borderTopColor: "#a855f7",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Auth gate ──────────────────────────────────────────
  // Si no hay usuario y TAMPOCO ha elegido entrar como invitado, se queda en la pantalla de espera
  // ── Auth gate corregido ────────────────────────────
// Eliminamos la restricción de "isGuest" para forzar el uso de autenticación real
  if (!user && view !== VIEWS.AUTH) {
    return (
      <div className="app-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#121214" }}>
        {/* Aquí se cargará tu componente AuthScreen real */}
        <AuthScreen /> 
      </div>
    );
  }

  return (
    <div className="app-root" style={{ minHeight: "100vh", background: "#121214" }}>
      {/* ── Onboarding modal ── */}
      {OnboardingModal && user && (
        <OnboardingModal userId={user?.id} />
      )}

      {/* ── Dashboard ── */}
      {view === VIEWS.DASHBOARD && (
        <Dashboard
          onStart={handleStart}
          onProgress={() => navigate(VIEWS.PROGRESS)}
        />
      )}

      {/* ── Workout flow ── */}
      {view === VIEWS.TEMPLATE_SELECTOR && (
        <TemplateSelector onSelect={handleTemplateSelected} onBack={handleReset} />
      )}

      {view === VIEWS.DAY_SELECTOR && (
        <DaySelector
          onSelect={handleDaySelected}
          onBack={() => navigate(VIEWS.TEMPLATE_SELECTOR)}
        />
      )}

      {view === VIEWS.CATEGORY_SELECTOR && (
        <CategorySelector
          day={selectedDay}
          onConfirm={handleCategoriesConfirmed}
          onBack={() => navigate(VIEWS.DAY_SELECTOR)}
        />
      )}

      {view === VIEWS.WORKOUT_FORM && (
        <WorkoutForm
          day={selectedDay}
          categories={
            selectedTemplate && selectedTemplate.categories
              ? selectedTemplate.categories.map((c) => c.name)
              : selectedCategories
          }
          templateCategories={
            selectedTemplate && selectedTemplate.categories
              ? selectedTemplate.categories
              : null
          }
          onSave={handleWorkoutSaved}
          onBack={() => {
            if (selectedTemplate && selectedTemplate.id !== "custom") {
              navigate(VIEWS.DAY_SELECTOR);
            } else {
              navigate(VIEWS.CATEGORY_SELECTOR);
            }
          }}
        />
      )}

      {view === VIEWS.SUMMARY && (
        <WorkoutSummary workout={savedWorkout} onDone={handleReset} />
      )}

      {/* ── Progress ── */}
      {view === VIEWS.PROGRESS && ProgressScreen && (
        <ProgressScreen onBack={() => navigate(VIEWS.DASHBOARD)} />
      )}
    </div>
  );
}