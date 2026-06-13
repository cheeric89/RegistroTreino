// App.jsx — Punto de entrada principal
// Para extender: aquí puedes integrar React Router si la app crece
import { useState } from "react";
import * as DashboardModule from "./components/dashboards";
const Dashboard = DashboardModule.Dashboard || DashboardModule.default || (() => null);
import DaySelector from "./components/dayselector"; 
import TemplateSelector from "./components/templateselector"; 
import CategorySelector from "./components/categoryselector"; 
import WorkoutForm from "./components/workoutform"; 
import WorkoutSummary from "./components/workoutsummary"; 

// Vistas posibles de la app (máquina de estados simple)
const VIEWS = {
  DASHBOARD: "dashboards",
  TEMPLATE_SELECTOR: "template_selector", 
  DAY_SELECTOR: "day_selector",
  CATEGORY_SELECTOR: "category_selector",
  WORKOUT_FORM: "workout_form",
  SUMMARY: "summary",
};

// Función auxiliar para generar la estructura de una serie vacía
const newSet = () => ({
  id: Date.now() + Math.random(), 
  weight: "",
  reps: "",
  done: false,
});

export default function App() {
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null); 
  const [savedWorkout, setSavedWorkout] = useState(null);

  // Navegar hacia adelante / atrás sin perder estado
  const navigate = (nextView) => setView(nextView);

  // Handler al dar inicio en el Dashboard
  const handleStart = () => navigate(VIEWS.TEMPLATE_SELECTOR);

  // Nuevo handler: cuando el usuario elige plantilla
  const handleTemplateSelected = (template) => {
    setSelectedTemplate(template);
    navigate(VIEWS.DAY_SELECTOR); // Salta directo a elegir el día
  };

  // Modificar handleDaySelected para bifurcar el flujo
  const handleDaySelected = (day) => {
    setSelectedDay(day);
    if (selectedTemplate && selectedTemplate.id !== "custom") {
      // Plantilla con ejercicios -> saltar CategorySelector e ir al Formulario
      navigate(VIEWS.WORKOUT_FORM);
    } else {
      // Flujo personalizado -> va a elegir los músculos primero
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

  return (
    <div className="app-root">
      {view === VIEWS.DASHBOARD && (
        <Dashboard onStart={handleStart} />
      )}

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
          // Si hay plantilla válida, mapeamos sus categorías internas. Si no, las seleccionadas a mano.
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
        <WorkoutSummary
          workout={savedWorkout}
          onDone={handleReset}
        />
      )}
    </div>
  );
}