export const MEAL_TYPES = [
  { id: "breakfast", label: "Desayuno", emoji: "☀️" },
  { id: "lunch", label: "Almuerzo", emoji: "🍽️" },
  { id: "snack", label: "Once / Snack", emoji: "🥪" },
  { id: "dinner", label: "Cena", emoji: "🌙" },
];

const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;

export const calculateFoodPortion = (food, grams) => {
  const weight = Math.max(0, Number(grams) || 0);
  const factor = weight / 100;
  return {
    calories: Math.round((Number(food?.kcal100) || 0) * factor),
    protein_g: round1((Number(food?.protein100) || 0) * factor),
    carbs_g: round1((Number(food?.carbs100) || 0) * factor),
    fat_g: round1((Number(food?.fat100) || 0) * factor),
  };
};

export const createMealItem = (food, portions = 1) => {
  const quantity = Math.max(0.25, Number(portions) || 1);
  const grams = round1((Number(food?.portionGrams) || 100) * quantity);
  const nutrition = calculateFoodPortion(food, grams);
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    food_id: food.id,
    name: food.name,
    category: food.category,
    source: food.source || "treino_catalog",
    estimated: Boolean(food.estimated),
    portion_label: food.portionLabel || "porción",
    portions: quantity,
    grams,
    kcal100: Number(food.kcal100) || 0,
    protein100: Number(food.protein100) || 0,
    carbs100: Number(food.carbs100) || 0,
    fat100: Number(food.fat100) || 0,
    recipe_ingredients: Array.isArray(food.ingredients) ? food.ingredients : undefined,
    ...nutrition,
  };
};

export const normalizeMeal = (meal = {}, fallbackType = "lunch") => ({
  id: meal.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
  type: meal.type || fallbackType,
  items: Array.isArray(meal.items) ? meal.items : [],
});

export const sumMealItems = (items = []) => items.reduce(
  (totals, item) => ({
    calories: totals.calories + (Number(item?.calories) || 0),
    protein_g: round1(totals.protein_g + (Number(item?.protein_g) || 0)),
    carbs_g: round1(totals.carbs_g + (Number(item?.carbs_g) || 0)),
    fat_g: round1(totals.fat_g + (Number(item?.fat_g) || 0)),
  }),
  { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
);

export const sumMeals = (meals = []) => {
  const totals = meals.reduce(
    (acc, meal) => {
      const mealTotals = sumMealItems(meal?.items || []);
      acc.calories += mealTotals.calories;
      acc.protein_g += mealTotals.protein_g;
      acc.carbs_g += mealTotals.carbs_g;
      acc.fat_g += mealTotals.fat_g;
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  return {
    calories: Math.round(totals.calories),
    protein_g: round1(totals.protein_g),
    carbs_g: round1(totals.carbs_g),
    fat_g: round1(totals.fat_g),
  };
};

export const getMealForType = (meals = [], type) =>
  normalizeMeal(meals.find((meal) => meal?.type === type), type);

export const upsertMealItem = (meals = [], mealType, item) => {
  const exists = meals.some((meal) => meal?.type === mealType);
  const next = exists
    ? meals.map((meal) => meal?.type === mealType
      ? { ...normalizeMeal(meal, mealType), items: [...(meal.items || []), item] }
      : meal)
    : [...meals, { id: mealType, type: mealType, items: [item] }];
  return next;
};

export const removeMealItem = (meals = [], mealType, itemId) => meals.map((meal) =>
  meal?.type === mealType
    ? { ...meal, items: (meal.items || []).filter((item) => item.id !== itemId) }
    : meal
);
