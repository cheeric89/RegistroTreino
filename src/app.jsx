// App.jsx — Punto de entrada principal
// Para extender: aquí puedes integrar React Router si la app crece
// o añadir un Context Provider global para estado compartido

import { useState } from "react";
import Dashboard from "./components/dashboards"; // Corregido: dashboards (tu archivo tiene 's')
import DaySelector from "./components/dayselector"; // Corregido: dayselector (todo en minúsculas)
import CategorySelector from "./components/categoryselector"; // Corregido: categoryselector (todo en minúsculas)
import WorkoutForm from "./components/workoutform"; // Corregido: workoutform (todo en minúsculas)
import WorkoutSummary from "./components/workoutsummary"; // Corregido: workoutsummary (todo en minúsculas)

// Vistas posibles de la app (máquina de estados simple)
const VIEWS = {
  DASHBOARD: "dashboards",
  DAY_SELECTOR: "day_selector",
  CATEGORY_SELECTOR: "category_selector",
  WORKOUT_FORM: "workout_form",
  SUMMARY: "summary",
};

export default function App() {
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [savedWorkout, setSavedWorkout] = useState(null);

  // Navegar hacia adelante / atrás sin perder estado
  const navigate = (nextView) => setView(nextView);

  const handleDaySelected = (day) => {
    setSelectedDay(day);
    navigate(VIEWS.CATEGORY_SELECTOR);
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
    setSavedWorkout(null);
    navigate(VIEWS.DASHBOARD);
  };

  return (
    <div className="app-root">
      {view === VIEWS.DASHBOARD && (
        <Dashboard onStart={() => navigate(VIEWS.DAY_SELECTOR)} />
      )}
      {view === VIEWS.DAY_SELECTOR && (
        <DaySelector
          onSelect={handleDaySelected}
          onBack={handleReset}
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
    </div>
  );
}