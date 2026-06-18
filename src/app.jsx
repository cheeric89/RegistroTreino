// src/app.jsx
import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import AuthScreen from "./components/auth/AuthScreen";

// ── Existing components ───────────────────────────────────
import * as DashboardModule from "./components/dashboards";
const Dashboard = DashboardModule.Dashboard || DashboardModule.default || (() => null);
import DaySelector from "./components/dayselector";
import TemplateSelector from "./components/templateselector";
import CategorySelector from "./components/categoryselector";
import WorkoutForm from "./components/workoutform";
import WorkoutSummary from "./components/workoutsummary";
import ProfileView from "./components/profile/ProfileView";

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

const VIEWS = {
  AUTH: "auth",
  DASHBOARD: "dashboards",
  TEMPLATE_SELECTOR: "template_selector",
  DAY_SELECTOR: "day_selector",
  CATEGORY_SELECTOR: "category_selector",
  WORKOUT_FORM: "workout_form",
  SUMMARY: "summary",
  PROGRESS: "progress",
  PROFILE: "profile", // Asegurado
};

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [savedWorkout, setSavedWorkout] = useState(null);

  const navigate = (nextView) => setView(nextView);

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

  if (loading) {
    return (
      <div className="app-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#121214" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #374151", borderTopColor: "#a855f7", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user && view !== VIEWS.AUTH) {
    return (
      <div className="app-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#121214" }}>
        <AuthScreen /> 
      </div>
    );
  }

  return (
    <div className="app-root">
      {view !== VIEWS.AUTH && (
        <header className="app-header" style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "15px 20px", 
          background: "#1e1e24",
          borderBottom: "1px solid #333" 
        }}>
          <div style={{ fontWeight: "bold", fontSize: "1.2rem", letterSpacing: "1px", cursor: "pointer" }} onClick={() => navigate(VIEWS.DASHBOARD)}>
            TREI<span style={{ color: "#a855f7" }}>NO</span>
          </div>
          <button 
            onClick={() => navigate(VIEWS.PROFILE)}
            style={{ background: "#7c3aed", border: "none", color: "white", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: "600" }}
          >
            👤 Perfil
          </button>
        </header>
      )}

      <main className="app-main">
        {OnboardingModal && user && <OnboardingModal userId={user?.id} />}

        {view === VIEWS.DASHBOARD && <Dashboard onStart={handleStart} onProgress={() => navigate(VIEWS.PROGRESS)} />}
        {view === VIEWS.TEMPLATE_SELECTOR && <TemplateSelector onSelect={handleTemplateSelected} onBack={handleReset} />}
        {view === VIEWS.DAY_SELECTOR && <DaySelector onSelect={handleDaySelected} onBack={() => navigate(VIEWS.TEMPLATE_SELECTOR)} />}
        {view === VIEWS.CATEGORY_SELECTOR && <CategorySelector day={selectedDay} onConfirm={handleCategoriesConfirmed} onBack={() => navigate(VIEWS.DAY_SELECTOR)} />}
        {view === VIEWS.WORKOUT_FORM && <WorkoutForm day={selectedDay} onSave={handleWorkoutSaved} onBack={() => navigate(VIEWS.CATEGORY_SELECTOR)} />}
        {view === VIEWS.SUMMARY && <WorkoutSummary workout={savedWorkout} onDone={handleReset} />}
        {view === VIEWS.PROGRESS && <ProgressScreen onBack={() => navigate(VIEWS.DASHBOARD)} />}
        {view === VIEWS.PROFILE && <ProfileView onBack={() => navigate(VIEWS.DASHBOARD)} />}
      </main>
    </div>
  );
}