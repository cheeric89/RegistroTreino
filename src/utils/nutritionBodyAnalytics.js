const DAY_MS = 24 * 60 * 60 * 1000;

const numberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const dateMs = (value) => {
  const timestamp = new Date(`${value}T12:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getAgeFromBirthDate = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
};

export const estimateNutritionTargets = (profile = {}) => {
  const safeProfile = profile || {};
  const weight = numberOrNull(safeProfile.weight_kg);
  const height = numberOrNull(safeProfile.height_cm);
  const age = getAgeFromBirthDate(safeProfile.birth_date);
  const sex = safeProfile.energy_formula_sex;
  if (!weight || !height || age == null || age < 18 || !["male", "female"].includes(sex)) {
    return null;
  }

  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
  const activityMultiplier = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
  }[safeProfile.activity_level] || 1.55;

  const maintenance = bmr * activityMultiplier;
  const adjustment = safeProfile.training_goal === "fat_loss"
    ? -300
    : safeProfile.training_goal === "muscle_gain"
      ? 200
      : 0;
  const calories = Math.max(1400, Math.round((maintenance + adjustment) / 10) * 10);
  const protein = Math.round(weight * 1.8);
  const fat = Math.round(weight * 0.8);
  const remainingCalories = Math.max(0, calories - protein * 4 - fat * 9);
  const carbs = Math.round(remainingCalories / 4);

  return {
    calories,
    protein,
    carbs,
    fat,
    maintenance: Math.round(maintenance),
    age,
  };
};

export const getWeightAnalytics = (entries = [], targetWeight = null) => {
  const weighted = entries
    .filter((entry) => numberOrNull(entry?.weight_kg))
    .map((entry) => ({ ...entry, weight_kg: Number(entry.weight_kg), timestamp: dateMs(entry.entry_date) }))
    .filter((entry) => entry.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp);

  const latest = weighted[0] || null;
  const oldest = weighted.at(-1) || null;

  const deltaForDays = (days) => {
    if (!latest) return null;
    const cutoff = latest.timestamp - days * DAY_MS;
    const baseline = weighted
      .filter((entry) => entry.timestamp <= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!baseline) return null;
    return Number((latest.weight_kg - baseline.weight_kg).toFixed(1));
  };

  let weeklyPace = null;
  if (latest && oldest && latest.timestamp > oldest.timestamp) {
    const weeks = (latest.timestamp - oldest.timestamp) / DAY_MS / 7;
    if (weeks >= 0.5) weeklyPace = Number(((latest.weight_kg - oldest.weight_kg) / weeks).toFixed(2));
  }

  const numericTarget = numberOrNull(targetWeight);
  return {
    latest,
    entries: weighted,
    delta7: deltaForDays(7),
    delta30: deltaForDays(30),
    delta90: deltaForDays(90),
    weeklyPace,
    targetWeight: numericTarget,
    remaining: latest && numericTarget ? Number((numericTarget - latest.weight_kg).toFixed(1)) : null,
  };
};

export const getTodayNutrition = (entries = []) => {
  const today = getLocalDateKey();
  const found = entries.find((entry) => entry.entry_date === today);
  if (found) return { ...found, meals: Array.isArray(found.meals) ? found.meals : [] };
  return {
    entry_date: today,
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    meals: [],
  };
};

export const getNutritionTargets = (profile = {}) => {
  const safeProfile = profile || {};
  return {
    calories: Math.max(0, Number(safeProfile.calorie_target) || 0),
    protein: Math.max(0, Number(safeProfile.protein_target_g) || 0),
    carbs: Math.max(0, Number(safeProfile.carbs_target_g) || 0),
    fat: Math.max(0, Number(safeProfile.fat_target_g) || 0),
  };
};

export const getMacroPercent = (value, target) => {
  const numericTarget = Number(target) || 0;
  if (numericTarget <= 0) return 0;
  return Math.min(120, Math.round(((Number(value) || 0) / numericTarget) * 100));
};
