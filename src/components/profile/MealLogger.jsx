import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Search, Trash2, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { searchFoodCatalog } from "../../data/foodCatalog";
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

export default function MealLogger({ entry, saving, onSave }) {
  const meals = Array.isArray(entry?.meals) ? entry.meals : [];
  const [activeMeal, setActiveMeal] = useState(null);
  const [query, setQuery] = useState("");
  const [remoteFoods, setRemoteFoods] = useState([]);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [portions, setPortions] = useState(1);

  const localFoods = useMemo(() => searchFoodCatalog(query), [query]);
  const combinedFoods = useMemo(() => {
    const seen = new Set();
    return [...localFoods, ...remoteFoods].filter((food) => {
      const key = `${food.name}|${food.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 14);
  }, [localFoods, remoteFoods]);

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
    const result = await onSave({
      ...entry,
      meals: nextMeals,
      calories: totals.calories,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
    });
    return result;
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
                <button type="button" className="meal-add-button" onClick={() => setActiveMeal(mealType.id)}><Plus size={15} /> Añadir</button>
              </div>

              {meal.items.length > 0 && (
                <div className="meal-items">
                  {meal.items.map((item) => (
                    <div key={item.id} className="meal-item">
                      <div className="meal-item__main">
                        <strong>{item.name}</strong>
                        <span>{item.portions} × {item.portion_label} · {item.grams} g{item.estimated ? " · aprox." : ""}</span>
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
              <div><span className="card-kicker">Añadir a {MEAL_TYPES.find((meal) => meal.id === activeMeal)?.label}</span><h3>¿Qué comiste?</h3></div>
              <button type="button" onClick={() => setActiveMeal(null)} aria-label="Cerrar"><X size={18} /></button>
            </header>

            <label className="meal-search-box">
              <Search size={17} />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej: arroz, pollo, marraqueta, yogur…" />
              {searchingRemote && <Loader2 size={16} className="is-spinning" />}
            </label>

            <div className="meal-search-hint">
              <span>Resultados Treino + productos envasados</span>
              <small>Los platos caseros marcados “aprox.” pueden variar según receta y cantidad.</small>
            </div>

            <div className="meal-food-results">
              {combinedFoods.map((food) => {
                const sample = createMealItem(food, 1);
                const selected = selectedFood?.id === food.id;
                return (
                  <button key={food.id} type="button" className={selected ? "is-selected" : ""} onClick={() => { setSelectedFood(food); setPortions(1); }}>
                    <div><strong>{food.name}</strong><span>{food.portionLabel} · {food.portionGrams} g{food.estimated ? " · aprox." : ""}</span></div>
                    <div><strong>{sample.calories} kcal</strong><span>P {sample.protein_g} · C {sample.carbs_g} · G {sample.fat_g}</span></div>
                    {selected && <Check size={17} />}
                  </button>
                );
              })}
              {!combinedFoods.length && query.trim().length >= 2 && !searchingRemote && (
                <div className="meal-search-empty">No encontramos ese alimento todavía. Prueba con un nombre más simple o una marca concreta.</div>
              )}
            </div>

            {selectedFood && preview && (
              <section className="meal-portion-card">
                <div className="meal-portion-card__heading"><div><span>Porción</span><strong>{selectedFood.name}</strong></div><span>{selectedFood.estimated ? "Estimación" : selectedFood.source === "open_food_facts" ? "Etiqueta / base externa" : "Referencia nutricional"}</span></div>
                <div className="meal-portion-controls">
                  <button type="button" onClick={() => setPortions((value) => Math.max(0.25, Math.round((value - 0.25) * 100) / 100))}>−</button>
                  <div><strong>{portions.toLocaleString("es-CL")} × {selectedFood.portionLabel}</strong><span>≈ {preview.grams} g</span></div>
                  <button type="button" onClick={() => setPortions((value) => Math.round((value + 0.25) * 100) / 100)}>+</button>
                </div>
                <div className="meal-portion-preview"><strong>{preview.calories} kcal</strong><span>{preview.protein_g} g proteína</span><span>{preview.carbs_g} g carbos</span><span>{preview.fat_g} g grasas</span></div>
                <button type="button" className="primary-action-button" onClick={addSelectedFood} disabled={saving}><Plus size={16} /> {saving ? "Guardando…" : "Agregar a la comida"}</button>
              </section>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
