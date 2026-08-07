import { useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useProfile } from "./hooks/useProfile";
import { clearDraftWorkout, getDraftWorkout } from "./utils/storage";
import AuthScreen from "./components/auth/AuthScreen";
import Dashboard from "./components/dashboards";
import DaySelector from "./components/dayselector";
import TemplateSelector from "./components/templateselector";
import CategorySelector from "./components/categoryselector";
import WorkoutForm from "./components/workoutform";
import WorkoutSummary from "./components/workoutsummary";
import ProfileView from "./components/profile/ProfileView";
import WorkoutDetail from "./components/WorkoutDetail";
import ProgressPage from "./components/ProgressPage";
import AppHeader from "./components/layout/AppHeader";
import BottomNavigation from "./components/layout/BottomNavigation";
import BrandLogo from "./components/layout/BrandLogo";

const VIEWS = {
  DASHBOARD: "dashboards",
  TEMPLATE_SELECTOR: "template_selector",
  DAY_SELECTOR: "day_selector",
  CATEGORY_SELECTOR: "category_selector",
  WORKOUT_FORM: "workout_form",
  SUMMARY: "summary",
  PROGRESS: "progress",
  PROFILE: "profile",
  WORKOUT_DETAIL: "workout_detail",
};

const CHROME_VIEWS = new Set([
  VIEWS.DASHBOARD,
  VIEWS.PROGRESS,
  VIEWS.PROFILE,
]);

export default function App() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [templateCategories, setTemplateCategories] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [savedWorkout, setSavedWorkout] = useState(null);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [repeatWorkout, setRepeatWorkout] = useState(null);

  useEffect(() => {
    const draft = getDraftWorkout();
    if (!draft?.catData?.length) return;

    setSelectedDay(draft.day || null);
    setSelectedCategories(draft.categories || []);
    setTemplateCategories(draft.templateCategories || []);
    setWorkoutStartTime(draft.workoutStartTime || Date.now());
    setView(VIEWS.WORKOUT_FORM);
  }, []);

  const navigate = (nextView) => setView(nextView);

  const handleStart = () => {
    setRepeatWorkout(null);
    setSelectedTemplate(null);
    setTemplateCategories([]);
    setSelectedCategories([]);
    setWorkoutStartTime(Date.now());
    navigate(VIEWS.TEMPLATE_SELECTOR);
  };

  const handleRepeatWorkout = (workout) => {
    clearDraftWorkout();
    setRepeatWorkout(workout);
    setSelectedWorkout(workout);
    setSelectedDay(workout.day || "Entrenamiento");
    setSelectedCategories(workout.categories || []);
    setTemplateCategories(workout.exercises || []);
    setWorkoutStartTime(Date.now());
    navigate(VIEWS.WORKOUT_FORM);
  };

  const handleTemplateSelected = (template) => {
    setSelectedTemplate(template);
    setTemplateCategories(template.categories || []);
    navigate(VIEWS.DAY_SELECTOR);
  };

  const handleDaySelected = (day) => {
    setSelectedDay(day);
    setWorkoutStartTime(Date.now());

    if (selectedTemplate && selectedTemplate.id !== "custom") {
      navigate(VIEWS.WORKOUT_FORM);
      return;
    }

    navigate(VIEWS.CATEGORY_SELECTOR);
  };

  const handleCategoriesConfirmed = (categories) => {
    setSelectedCategories(categories);
    navigate(VIEWS.WORKOUT_FORM);
  };

  const handleWorkoutSaved = (workout) => {
    setSavedWorkout(workout);
    setRepeatWorkout(null);
    navigate(VIEWS.SUMMARY);
  };

  const handleOpenWorkout = (workout) => {
    setSelectedWorkout(workout);
    navigate(VIEWS.WORKOUT_DETAIL);
  };

  const handleReset = () => {
    setSelectedDay(null);
    setSelectedCategories([]);
    setTemplateCategories([]);
    setSelectedTemplate(null);
    setSavedWorkout(null);
    setSelectedWorkout(null);
    setRepeatWorkout(null);
    setWorkoutStartTime(null);
    navigate(VIEWS.DASHBOARD);
  };

  const handleWorkoutBack = () => {
    if (repeatWorkout) {
      navigate(VIEWS.DASHBOARD);
      return;
    }

    if (selectedTemplate && selectedTemplate.id !== "custom") {
      navigate(VIEWS.DAY_SELECTOR);
      return;
    }

    navigate(VIEWS.CATEGORY_SELECTOR);
  };

  if (loading) {
    return (
      <div className="app-loading-screen">
        <BrandLogo compact />
        <div className="app-loading-spinner" aria-label="Cargando Treino" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const showChrome = CHROME_VIEWS.has(view);

  return (
    <div className="app-root">
      {showChrome && (
        <AppHeader
          currentView={view}
          onNavigate={navigate}
          user={user}
          profile={profile}
        />
      )}

      <main className={`app-main ${showChrome ? "app-main--shell" : "app-main--immersive"}`}>
        {view === VIEWS.DASHBOARD && (
          <Dashboard
            user={user}
            profile={profile}
            onStart={handleStart}
            onOpenWorkout={handleOpenWorkout}
            onRepeatWorkout={handleRepeatWorkout}
          />
        )}

        {view === VIEWS.PROGRESS && <ProgressPage />}

        {view === VIEWS.PROFILE && <ProfileView />}

        {view === VIEWS.WORKOUT_DETAIL && (
          <WorkoutDetail
            workout={selectedWorkout}
            onBack={() => navigate(VIEWS.DASHBOARD)}
            onRepeat={handleRepeatWorkout}
          />
        )}

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
            categories={selectedCategories}
            templateCategories={templateCategories}
            workoutStartTime={workoutStartTime}
            initialWorkout={repeatWorkout}
            repeatWorkout={repeatWorkout}
            onSave={handleWorkoutSaved}
            onBack={handleWorkoutBack}
          />
        )}

        {view === VIEWS.SUMMARY && (
          <WorkoutSummary workout={savedWorkout} onDone={handleReset} />
        )}
      </main>

      {showChrome && (
        <BottomNavigation
          currentView={view}
          onNavigate={navigate}
          onStart={handleStart}
        />
      )}
    </div>
  );
}
