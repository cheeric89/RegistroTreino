// src/app.jsx
// Updated App — adds AUTH + PROGRESS views.
// All existing workout flow logic is UNTOUCHED.
// New: reads auth state to guard routes + adds PROGRESS view.
//
// FIX (layout móvil/iOS + desktop): el header global y el <main> ahora
// usan las clases .app-header / .app-main en vez de estilos inline de
// tamaño. Esto permite que .app-root sea la ÚNICA pieza de la app que
// declara una unidad de viewport (ver styles.css) y que todo lo demás
// herede su altura real vía flexbox. Antes, .screen (dentro de
// WorkoutForm y el resto de vistas) volvía a pedir 100dvh por su cuenta,
// lo que hacía que el contenido se calculara con una altura más grande
// que el espacio real disponible (el header y el padding del <main> ya
// habían consumido parte de ese espacio) y .form-scroll terminaba
// colapsado a 0 mientras el footer (flex-shrink:0) seguía visible.

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
import ProfileView from "./components/profile/ProfileView";
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
  PROFILE: "profile", // FIX: faltaba esta clave — el botón de Perfil llamaba
                       // a navigate(VIEWS.PROFILE), que antes era `undefined`.
                       // "Funcionaba" solo porque view también quedaba
                       // undefined y la comparación coincidía por accidente.
};

export default function App() {
  const { user, loading } = useAuth();
  
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [isGuest, setIsGuest] = useState(false); // <-- Controla el acceso de invitado de forma segura
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [templateCategories, setTemplateCategories] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [savedWorkout, setSavedWorkout] = useState(null);

  const navigate = (nextView) => setView(nextView);

  // ── Handlers ───────────────────────────────────────────
  const handleStart = () => navigate(VIEWS.TEMPLATE_SELECTOR);

  const handleTemplateSelected = (template) => {
  console.log("TEMPLATE COMPLETO:", JSON.stringify(template, null, 2));

  setSelectedTemplate(template);

  // Guarda las categorías de la plantilla elegida
  setTemplateCategories(template.categories || []);

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
  console.log("DEBUG: Cats recibidos en App.jsx:", cats); // <--- ESTO NOS DIRÁ SI EL PROBLEMA VIENE DEL SELECTOR
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
  setTemplateCategories([]);
  setSelectedTemplate(null);
  setSavedWorkout(null);
  navigate(VIEWS.DASHBOARD);
};

  // ── Auth loading splash ────────────────────────────────
  if (loading) {
    return (
      <div className="app-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#121214" }}>
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
  // Si no hay usuario, se queda en la pantalla de espera
  if (!user && view !== VIEWS.AUTH) {
    return (
      <div className="app-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#121214" }}>
        {/* Aquí se cargará tu componente AuthScreen real */}
        <AuthScreen /> 
      </div>
    );
  }
  console.log("DEBUG — selectedDay actual:", selectedDay);
  return (
    <div className="app-root" style={{ background: "#121214", color: "white" }}>
      
      {/* ── HEADER DE TREINO ──
          FIX: antes tenía estilos inline de layout únicamente (display:flex,
          padding, etc.) pero ninguna instrucción de "no te encojas". Ahora la
          clase .app-header (definida en styles.css) le da flex-shrink:0
          dentro de la columna flex de .app-root, así su alto siempre se
          respeta y nunca le "roba" espacio a .app-main sin que se note. */}
      {view !== VIEWS.AUTH && (
        <header
          className="app-header"
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "15px 20px", 
            background: "#1e1e24",
            borderBottom: "1px solid #333" 
          }}
        >
          <div 
            style={{ fontWeight: "bold", fontSize: "1.2rem", letterSpacing: "1px", cursor: "pointer" }} 
            onClick={() => navigate(VIEWS.DASHBOARD)}
          >
            TREI<span style={{ color: "#a855f7" }}>NO</span>
          </div>
          <button 
            onClick={() => navigate(VIEWS.PROFILE)}
            style={{ 
              background: "#7c3aed", 
              border: "none", 
              color: "white", 
              padding: "8px 16px", 
              borderRadius: "20px", 
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            👤 Perfil
          </button>
        </header>
      )}

      {/* ── CONTENIDO ──
          FIX: ya no lleva padding inline. Ese padding (20px arriba y abajo)
          le restaba altura real a .screen sin que .screen se enterara, lo
          que era parte de la causa del colapso. El padding horizontal que
          necesitan las vistas ya lo maneja cada una internamente
          (.topbar, .form-scroll, .dashboard-screen, etc.). La clase
          .app-main le da flex:1 + min-height:0 + overflow-y:auto, que es
          lo que permite que .screen (height:100%) reciba una altura real
          y definida en vez de "auto". */}
      <main className="app-main">
        {/* Onboarding modal */}
        {OnboardingModal && user && <OnboardingModal userId={user?.id} />}

        {/* Dashboard */}
{view === VIEWS.DASHBOARD && (
  <Dashboard 
    onStart={handleStart} 
    onProgress={() => navigate(VIEWS.PROGRESS)} 
  />
)}

{/* Workout flow */}
{view === VIEWS.TEMPLATE_SELECTOR && (
  <TemplateSelector 
    onSelect={handleTemplateSelected} 
    onBack={handleReset} 
  />
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
    categories={selectedCategories}
    templateCategories={templateCategories || []}
    onSave={handleWorkoutSaved}
    onBack={() => navigate(VIEWS.CATEGORY_SELECTOR)}
  />
)}

{view === VIEWS.SUMMARY && (
  <WorkoutSummary 
    workout={savedWorkout}
    onDone={handleReset}
  />
)}

        {/* Perfil */}
        {view === VIEWS.PROFILE && (
          <ProfileView 
            onBack={() => navigate(VIEWS.DASHBOARD)}
          />
        )}
      </main>
    </div>
  );
}