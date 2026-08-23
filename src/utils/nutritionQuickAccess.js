const normalizeText = (value = "") => String(value)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim();

export const getFoodKey = (food = {}) =>
  String(food.barcode || food.id || normalizeText(food.name));

export const toFoodSnapshot = (food = {}) => ({
  id: food.id || getFoodKey(food),
  name: food.name || "Alimento",
  aliases: Array.isArray(food.aliases) ? food.aliases : [],
  category: food.category || "Alimento",
  source: food.source || "treino_catalog",
  estimated: Boolean(food.estimated),
  barcode: food.barcode || null,
  portionLabel: food.portionLabel || food.portion_label || "porción",
  portionGrams: Number(food.portionGrams ?? food.grams ?? 100) || 100,
  kcal100: Number(food.kcal100) || 0,
  protein100: Number(food.protein100) || 0,
  carbs100: Number(food.carbs100) || 0,
  fat100: Number(food.fat100) || 0,
  ingredients: Array.isArray(food.ingredients)
    ? food.ingredients
    : Array.isArray(food.recipe_ingredients)
      ? food.recipe_ingredients
      : undefined,
});

export const isFavoriteFood = (foods = [], food = {}) => {
  const key = getFoodKey(food);
  return foods.some((item) => getFoodKey(item) === key);
};

export const toggleFavoriteFood = (foods = [], food = {}) => {
  const snapshot = toFoodSnapshot(food);
  const key = getFoodKey(snapshot);
  if (foods.some((item) => getFoodKey(item) === key)) {
    return foods.filter((item) => getFoodKey(item) !== key);
  }
  return [snapshot, ...foods].slice(0, 40);
};

export const pushRecentFood = (foods = [], food = {}, limit = 16) => {
  const snapshot = toFoodSnapshot(food);
  const key = getFoodKey(snapshot);
  return [snapshot, ...foods.filter((item) => getFoodKey(item) !== key)].slice(0, limit);
};

export const matchesFoodQuery = (food = {}, query = "") => {
  const normalized = normalizeText(query);
  if (!normalized) return true;
  const values = [food.name, food.category, ...(food.aliases || [])].map(normalizeText);
  return values.some((value) => value.includes(normalized));
};
