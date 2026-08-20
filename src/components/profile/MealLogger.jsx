import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Save, Search, Trash2, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { searchFoodCatalog } from "../../data/foodCatalog";
import { useProfile } from "../../hooks/useProfile";
import {
  MEAL_TYPES,
  createMealItem,
  getMealForType,
  removeMealItem,
  sumMealItems,
  sumMeals,
  upsertMealItem,
} from "../../utils/mealNutrition";
import { searchOpenFoodFacts } from "../../utils/openFoodFacts";

const formatMacro = (value) => `${Number(value || 0).toLocaleString("es-CL")} g`;
const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;
const normalize = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const makeId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export default function MealLogger({ entry, saving, onSave }) {
  const { profile, saveProfile, saving: profileSaving } = useProfile();
  const customFoods = Array.isArray(profile?.custom_recipes) ? profile.custom_recipes : [];
  const meals = Array.isArray(entry?.meals) ? entry.meals : [];
  const [activeMeal, setActiveMeal] = useState(null);
  const [query, setQuery] = useState("");
  const [remoteFoods, setRemoteFoods] = useState([]);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [portions, setPortions] = useState(1);
  const [customMode, setCustomMode] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [recipeServings, setRecipeServings] = useState(1);
  const [recipeItems, setRecipeItems] = useState([]);

  const localFoods = useMemo(() => searchFoodCatalog(query), [query]);
  const customMatches = useMemo(() => {
    const q = normalize(query);
    if (!q) return customFoods.slice(0, 8);
    return customFoods.filter((food) => normalize(food?.name).includes(q)).slice(0, 8);
  }, [customFoods, query]);

  const combinedFoods = useMemo(() => {
    const seen = new Set();
    return [...customMatches, ...localFoods, ...remoteFoods].filter((food) => {
      const key = `${food.name}|${food.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 14);
  }, [customMatches, localFoods, remoteFoods]);

  useEffect(() => {
    if (!activeMeal || query.trim().length < 3) {
      setRemoteFoods([]);
      setSearchingRemote(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingRemote(true);
      const results = await searchOpenFoodFacts(query, { signal: controller.signal });
      setRemoteFoods(results);
      setSearchingRemote(false);
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeMeal, query]);

  useEffect(() => {
    setSelectedFood(null);
    setPortions(1);
  }, [query, activeMeal]);

  const persistMeals = async (nextMeals) => {
    const totals = sumMeals(nextMeals);
    return onSave({
      ...entry,
      meals: nextMeals,
      calories: totals.calories,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
    });
  };

  const addSelectedFood = async () => {
    if (!activeMeal || !selectedFood) return;
    const item = createMealItem(selectedFood, portions);
    const nextMeals = upsertMealItem(meals, activeMeal, item);
    const result = await persistMeals(nextMeals);
    if (result?.error) toast.warning("Comida guardada localmente; se sincronizará después");
    else toast.success(`${selectedFood.name} agregado`);
    setSelectedFood(null);
    setQuery("");
    setPortions(1);
  };

  const deleteItem = async (mealType, itemId) => {
    const nextMeals = removeMealItem(meals, mealType, itemId);
    const result = await persistMeals(nextMeals);
    if (result?.error) toast.warning("Cambio guardado localmente");
  };

  const startCustomRecipe = () => {
    setCustomMode(true);
    setRecipeName("");
    setRecipeServings(1);
    setRecipeItems([]);
    setQuery("");
    setSelectedFood(null);
    setPortions(1);
  };

  const cancelCustomRecipe = () => {
    setCustomMode(false);
    setRecipeName("");
    setRecipeItems([]);
    setQuery("");
    setSelectedFood(null);
    setPortions(1);
  };

  const addIngredient = () => {
    if (!selectedFood) return;
    setRecipeItems((current) => [...current, createMealItem(selectedFood, portions)]);
    setSelectedFood(null);
    setQuery("");
    setPortions(1);
  };

  const removeIngredient = (id) => {
    setRecipeItems((current) => current.filter((item) => item.id !== id));
  };

  const recipeTotals = sumMealItems(recipeItems);
  const recipeTotalGrams = round1(recipeItems.reduce((total, item) => total + (Number(item.grams) || 0), 0));
  const safeServings = Math.max(1, Number(recipeServings) || 1);
  const recipeServingGrams = recipeTotalGrams > 0 ? round1(recipeTotalGrams / safeServings) : 0;

  const buildRecipeFood = () => {
    if (!recipeTotalGrams) return null;
    const factor = 100 / recipeTotalGrams;
    return {
      id: `custom-recipe-${makeId()}`,
      name: recipeName.trim(),
      aliases: [],
      category: "Mis comidas",
      source: "custom_recipe",
      estimated: recipeItems.some((item) => item.estimated),
      portionLabel: "1 porción",
      portionGrams: recipeServingGrams,
      kcal100: round1(recipeTotals.calories * factor),
      protein100: round1(recipeTotals.protein_g * factor),
      carbs100: round1(recipeTotals.carbs_g * factor),
      fat100: round1(recipeTotals.fat_g * factor),
      servings: safeServings,
      ingredients: recipeItems.map((item) => ({
        name: item.name,
        grams: item.grams,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      })),
      created_at: new Date().toISOString(),
    };
  };

  const saveCustomRecipe = async () => {
    if (!recipeName.trim()) return toast.error("Ponle un nombre a tu comida");
    if (!recipeItems.length) return toast.error("Agrega al menos un ingrediente");
    const recipe = buildRecipeFood();
    if (!recipe) return toast.error("No se pudo calcular la receta");

    const next = [recipe, ...customFoods.filter((item) => normalize(item.name) !== normalize(recipe.name))];
    const result = await saveProfile({ custom_recipes: next });
    if (result?.error) toast.warning("Receta guardada localmente; se sincronizará después");
    else toast.success(`${recipe.name} guardada en Mis comidas`);

    setCustomMode(false);
    setRecipeName("");
    setRecipeItems([]);
    setSelectedFood(recipe);
    setPortions(1);
    setQuery("");
  };

  const preview = selectedFood ? createMealItem(selectedFood, portions) : null;
  const dailyTotals = sumMeals(meals);

  return (
    <section className="meal-logger-card">
      <header className="meal-logger-card__header">
        <div>
          <span className="card-kicker">Diario de comidas</span>
          <h3>Registra lo que comiste, no los macros</h3>
          <p>Treino calcula automáticamente calorías y macros según alimento y porción.</p>
        </div>
        <Utensils size={20} />
      </header>

      <div className="meal-logger-summary">
        <div><span>Calorías</span><strong>{dailyTotals.calories.toLocaleString("es-CL")} kcal</strong></div>
        <div><span>Proteína</span><strong>{formatMacro(dailyTotals.protein_g)}</strong></div>
        <div><span>Carbos</span><strong>{formatMacro(dailyTotals.carbs_g)}</strong></div>
        <div><span>Grasas</span><strong>{formatMacro(dailyTotals.fat_g)}</strong></div>
      </div>

      {customFoods.length > 0 && (
        <div className="custom-food-strip">
          <span>Mis comidas</span>
          <div>{customFoods.slice(0, 5).map((food) => <span key={food.id}>{food.name}</span>)}</div>
        </div>
      )}

      <div className="meal-list">
        {MEAL_TYPES.map((mealType) => {
          const meal = getMealForType(meals, mealType.id);
          const totals = sumMealItems(meal.items);
          return (
            <article key={mealType.id} className="meal-block">
              <div className="meal-block__heading">
                <div>
                  <span className="meal-block__emoji" aria-hidden="true">{mealType.emoji}</span>
                  <div><strong>{mealType.label}</strong><small>{meal.items.length ? `${totals.calories.toLocaleString("es-CL")} kcal · ${formatMacro(totals.protein_g)} proteína` : "Sin alimentos todavía"}</small></div>
                </div>
                <button type="button" className="meal-add-button" onClick={() => { setActiveMeal(mealType.id); setCustomMode(false); }}><Plus size={15} /> Añadir</button>
              </div>

              {meal.items.length > 0 && (
                <div className="meal-items">
                  {meal.items.map((item) => (
                    <div key={item.id} className="meal-item">
                      <div className="meal-item__main">
                        <strong>{item.name}</strong>
                        <span>{item.portions} × {item.portion_label} · {item.grams} g{item.estimated ? " · aprox." : ""}{item.source === "custom_recipe" ? " · personalizada" : ""}</span>
                      </div>
                      <div className="meal-item__nutrition">
                        <strong>{Number(item.calories || 0).toLocaleString("es-CL")} kcal</strong>
                        <span>P {formatMacro(item.protein_g)} · C {formatMacro(item.carbs_g)} · G {formatMacro(item.fat_g)}</span>
                      </div>
                      <button type="button" className="meal-item__delete" onClick={() => deleteItem(mealType.id, item.id)} aria-label={`Eliminar ${item.name}`}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {activeMeal && (
        <div className="meal-picker-backdrop" role="presentation" onMouseDown={() => setActiveMeal(null)}>
          <div className="meal-picker" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span className="card-kicker">{customMode ? "Crear comida personalizada" : `Añadir a ${MEAL_TYPES.find((meal) => meal.id === activeMeal)?.label}`}</span>
                <h3>{customMode ? "Construye tu receta" : "¿Qué comiste?"}</h3>
              </div>
              <button type="button" onClick={() => setActiveMeal(null)} aria-label="Cerrar"><X size={18} /></button>
            </header>

            {customMode && (
              <div className="custom-recipe-meta">
                <label><span>Nombre</span><input value={recipeName} onChange={(event) => setRecipeName(event.target.value)} placeholder="Ej: Mi arroz con pollo" /></label>
                <label><span>Porciones que rinde</span><input type="number" min="1" step="1" value={recipeServings} onChange={(event) => setRecipeServings(Math.max(1, Number(event.target.value) || 1))} /></label>
              </div>
            )}

            <label className="meal-search-box">
              <Search size={17} />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={customMode ? "Busca un ingrediente…" : "Ej: arroz, pollo, marraqueta, yogur…"} />
              {searchingRemote && <Loader2 size={16} className="is-spinning" />}
            </label>

            {!customMode && (
              <div className="meal-search-hint meal-search-hint--actions">
                <div><span>Mis comidas + Treino + productos envasados</span><small>Los platos caseros marcados “aprox.” pueden variar según receta y cantidad.</small></div>
                <button type="button" className="custom-recipe-start" onClick={startCustomRecipe}><Plus size={15} /> Crear personalizada</button>
              </div>
            )}

            {customMode && recipeItems.length > 0 && (
              <div className="custom-recipe-items">
                <div className="custom-recipe-items__heading"><span>Ingredientes</span><strong>{recipeTotals.calories} kcal totales</strong></div>
                {recipeItems.map((item) => (
                  <div key={item.id}><div><strong>{item.name}</strong><span>{item.grams} g · {item.calories} kcal</span></div><button type="button" onClick={() => removeIngredient(item.id)} aria-label={`Quitar ${item.name}`}><Trash2 size={14} /></button></div>
                ))}
              </div>
            )}

            <div className="meal-food-results">
              {combinedFoods.map((food) => {
                const sample = createMealItem(food, 1);
                const selected = selectedFood?.id === food.id;
                return (
                  <button key={food.id} type="button" className={selected ? "is-selected" : ""} onClick={() => { setSelectedFood(food); setPortions(1); }}>
                    <div><strong>{food.name}</strong><span>{food.portionLabel} · {food.portionGrams} g{food.estimated ? " · aprox." : ""}{food.source === "custom_recipe" ? " · Mis comidas" : ""}</span></div>
                    <div><strong>{sample.calories} kcal</strong><span>P {sample.protein_g} · C {sample.carbs_g} · G {sample.fat_g}</span></div>
                    {selected && <Check size={17} />}
                  </button>
                );
              })}
              {!combinedFoods.length && query.trim().length >= 2 && !searchingRemote && (
                <div className="meal-search-empty">No encontramos ese alimento todavía. {customMode ? "Prueba con otro nombre de ingrediente." : "Puedes crear una comida personalizada."}</div>
              )}
            </div>

            {selectedFood && preview && (
              <section className="meal-portion-card">
                <div className="meal-portion-card__heading"><div><span>Porción</span><strong>{selectedFood.name}</strong></div><span>{selectedFood.estimated ? "Estimación" : selectedFood.source === "open_food_facts" ? "Etiqueta / base externa" : selectedFood.source === "custom_recipe" ? "Mis comidas" : "Referencia nutricional"}</span></div>
                <div className="meal-portion-controls">
                  <button type="button" onClick={() => setPortions((value) => Math.max(0.25, Math.round((value - 0.25) * 100) / 100))}>−</button>
                  <div><strong>{portions.toLocaleString("es-CL")} × {selectedFood.portionLabel}</strong><span>≈ {preview.grams} g</span></div>
                  <button type="button" onClick={() => setPortions((value) => Math.round((value + 0.25) * 100) / 100)}>+</button>
                </div>
                <div className="meal-portion-preview"><strong>{preview.calories} kcal</strong><span>{preview.protein_g} g proteína</span><span>{preview.carbs_g} g carbos</span><span>{preview.fat_g} g grasas</span></div>
                <button type="button" className="primary-action-button" onClick={customMode ? addIngredient : addSelectedFood} disabled={saving}><Plus size={16} /> {customMode ? "Agregar ingrediente" : saving ? "Guardando…" : "Agregar a la comida"}</button>
              </section>
            )}

            {customMode && (
              <section className="custom-recipe-footer">
                <div>
                  <span>Por porción</span>
                  <strong>{recipeItems.length ? `${Math.round(recipeTotals.calories / safeServings)} kcal` : "—"}</strong>
                  <small>{recipeServingGrams ? `≈ ${recipeServingGrams} g · P ${round1(recipeTotals.protein_g / safeServings)} · C ${round1(recipeTotals.carbs_g / safeServings)} · G ${round1(recipeTotals.fat_g / safeServings)}` : "Agrega ingredientes para calcular"}</small>
                </div>
                <div>
                  <button type="button" className="secondary-action-button" onClick={cancelCustomRecipe}>Cancelar</button>
                  <button type="button" className="primary-action-button" onClick={saveCustomRecipe} disabled={!recipeItems.length || !recipeName.trim() || profileSaving}><Save size={15} /> Guardar en Mis comidas</button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
