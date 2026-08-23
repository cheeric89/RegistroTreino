import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  Copy,
  History,
  Loader2,
  Plus,
  Save,
  ScanLine,
  Search,
  Star,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { searchFoodCatalog } from "../../data/foodCatalog";
import { useProfile } from "../../hooks/useProfile";
import {
  MEAL_TYPES,
  cloneMeals,
  createMealItem,
  getMealForType,
  removeMealItem,
  replaceMealItems,
  sumMealItems,
  sumMeals,
  upsertMealItem,
} from "../../utils/mealNutrition";
import {
  getFoodKey,
  isFavoriteFood,
  matchesFoodQuery,
  pushRecentFood,
  toggleFavoriteFood,
} from "../../utils/nutritionQuickAccess";
import { getOpenFoodFactsByBarcode, searchOpenFoodFacts } from "../../utils/openFoodFacts";

const formatMacro = (value) => `${Number(value || 0).toLocaleString("es-CL")} g`;
const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;
const normalize = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const makeId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const hasMealData = (entry) => Array.isArray(entry?.meals)
  && entry.meals.some((meal) => Array.isArray(meal?.items) && meal.items.length > 0);

export default function MealLogger({ entry, history = [], saving, onSave }) {
  const { profile, saveProfile, saving: profileSaving } = useProfile();
  const customFoods = Array.isArray(profile?.custom_recipes) ? profile.custom_recipes : [];
  const favoriteFoods = Array.isArray(profile?.favorite_foods) ? profile.favorite_foods : [];
  const recentFoods = Array.isArray(profile?.recent_foods) ? profile.recent_foods : [];
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
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const scanFrameRef = useRef(null);

  const localFoods = useMemo(() => searchFoodCatalog(query), [query]);
  const customMatches = useMemo(() => {
    const q = normalize(query);
    if (!q) return customFoods.slice(0, 8);
    return customFoods.filter((food) => normalize(food?.name).includes(q)).slice(0, 8);
  }, [customFoods, query]);
  const favoriteMatches = useMemo(
    () => favoriteFoods.filter((food) => matchesFoodQuery(food, query)).slice(0, 10),
    [favoriteFoods, query]
  );
  const recentMatches = useMemo(
    () => recentFoods.filter((food) => matchesFoodQuery(food, query)).slice(0, 10),
    [recentFoods, query]
  );

  const combinedFoods = useMemo(() => {
    const seen = new Set();
    return [...favoriteMatches, ...recentMatches, ...customMatches, ...localFoods, ...remoteFoods]
      .filter((food) => {
        const key = getFoodKey(food);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 18);
  }, [favoriteMatches, recentMatches, customMatches, localFoods, remoteFoods]);

  const previousEntries = useMemo(() => {
    const currentDate = String(entry?.entry_date || "");
    return [...history]
      .filter((item) => item?.entry_date && item.entry_date !== currentDate && item.entry_date < currentDate && hasMealData(item))
      .sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
  }, [entry?.entry_date, history]);

  const previousDay = previousEntries[0] || null;

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

  useEffect(() => () => {
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    cameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
  }, []);

  const stopCamera = () => {
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    scanFrameRef.current = null;
    cameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const closePicker = () => {
    stopCamera();
    setBarcodeOpen(false);
    setActiveMeal(null);
  };

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

  const rememberFood = async (food) => {
    const nextRecent = pushRecentFood(recentFoods, food);
    await saveProfile({ recent_foods: nextRecent });
  };

  const addSelectedFood = async () => {
    if (!activeMeal || !selectedFood) return;
    const item = createMealItem(selectedFood, portions);
    const nextMeals = upsertMealItem(meals, activeMeal, item);
    const result = await persistMeals(nextMeals);
    await rememberFood(selectedFood);
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

  const toggleFavorite = async (food) => {
    const wasFavorite = isFavoriteFood(favoriteFoods, food);
    const next = toggleFavoriteFood(favoriteFoods, food);
    const result = await saveProfile({ favorite_foods: next });
    if (result?.error) return toast.warning("No se pudo sincronizar el favorito");
    toast.success(wasFavorite ? "Quitado de favoritos" : "Agregado a favoritos");
  };

  const copyPreviousDay = async () => {
    if (!previousDay) return toast.info("Todavía no hay un día anterior para copiar");
    const result = await persistMeals(cloneMeals(previousDay.meals));
    if (result?.error) toast.warning("Día copiado localmente; se sincronizará después");
    else toast.success(`Copiado desde ${previousDay.entry_date}`);
  };

  const copyPreviousMeal = async (mealType) => {
    const sourceEntry = previousEntries.find((candidate) => {
      const sourceMeal = getMealForType(candidate.meals, mealType);
      return sourceMeal.items.length > 0;
    });
    if (!sourceEntry) return toast.info("No encontramos una comida anterior de este tipo");

    const sourceMeal = getMealForType(sourceEntry.meals, mealType);
    const nextMeals = replaceMealItems(meals, mealType, sourceMeal.items);
    const result = await persistMeals(nextMeals);
    if (result?.error) toast.warning("Comida copiada localmente");
    else toast.success(`Comida copiada desde ${sourceEntry.entry_date}`);
  };

  const startCustomRecipe = () => {
    setCustomMode(true);
    setRecipeName("");
    setRecipeServings(1);
    setRecipeItems([]);
    setQuery("");
    setSelectedFood(null);
    setPortions(1);
    setBarcodeOpen(false);
    stopCamera();
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

  const lookupBarcode = async (rawCode = barcodeValue) => {
    const code = String(rawCode || "").replace(/\D/g, "");
    if (code.length < 8) return toast.info("Ingresa un código de barras válido");
    setBarcodeLoading(true);
    const product = await getOpenFoodFactsByBarcode(code);
    setBarcodeLoading(false);
    if (!product) return toast.info("No encontramos ese producto en Open Food Facts");
    setSelectedFood(product);
    setPortions(1);
    setBarcodeValue(code);
    setBarcodeOpen(false);
    stopCamera();
    toast.success("Producto encontrado");
  };

  const startBarcodeCamera = async () => {
    if (!("BarcodeDetector" in window)) {
      toast.info("Este navegador no soporta escaneo automático. Puedes escribir el código manualmente.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.info("La cámara no está disponible en este navegador");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const supported = await window.BarcodeDetector.getSupportedFormats?.();
      const preferred = ["ean_13", "ean_8", "upc_a", "upc_e"];
      const formats = Array.isArray(supported)
        ? preferred.filter((format) => supported.includes(format))
        : preferred;
      const detector = new window.BarcodeDetector(formats.length ? { formats } : undefined);

      const scan = async () => {
        if (!videoRef.current || !cameraStreamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const value = results?.[0]?.rawValue;
          if (value) {
            setBarcodeValue(value);
            stopCamera();
            await lookupBarcode(value);
            return;
          }
        } catch (error) {
          console.warn("[Treino] escáner de código:", error?.message || error);
        }
        scanFrameRef.current = requestAnimationFrame(scan);
      };
      scanFrameRef.current = requestAnimationFrame(scan);
    } catch (error) {
      stopCamera();
      toast.warning("No pudimos abrir la cámara. Puedes ingresar el código manualmente.");
    }
  };

  const preview = selectedFood ? createMealItem(selectedFood, portions) : null;
  const dailyTotals = sumMeals(meals);

  return (
    <section className="meal-logger-card">
      <header className="meal-logger-card__header">
        <div>
          <span className="card-kicker">Diario de comidas · Treino 1.5</span>
          <h3>Registra lo que comiste, no los macros</h3>
          <p>Favoritos, recientes, copiar comidas y código de barras para registrar en menos pasos.</p>
        </div>
        <Utensils size={20} />
      </header>

      <div className="meal-logger-summary">
        <div><span>Calorías</span><strong>{dailyTotals.calories.toLocaleString("es-CL")} kcal</strong></div>
        <div><span>Proteína</span><strong>{formatMacro(dailyTotals.protein_g)}</strong></div>
        <div><span>Carbos</span><strong>{formatMacro(dailyTotals.carbs_g)}</strong></div>
        <div><span>Grasas</span><strong>{formatMacro(dailyTotals.fat_g)}</strong></div>
      </div>

      <div className="meal-speed-actions">
        <div>
          <span><Star size={14} /> {favoriteFoods.length} favoritos</span>
          <span><History size={14} /> {recentFoods.length} recientes</span>
        </div>
        <button type="button" onClick={copyPreviousDay} disabled={!previousDay || saving}>
          <Copy size={15} /> {previousDay ? `Copiar día ${previousDay.entry_date}` : "Sin día anterior"}
        </button>
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
          const hasPreviousMeal = previousEntries.some((candidate) => getMealForType(candidate.meals, mealType.id).items.length > 0);
          return (
            <article key={mealType.id} className="meal-block">
              <div className="meal-block__heading">
                <div>
                  <span className="meal-block__emoji" aria-hidden="true">{mealType.emoji}</span>
                  <div><strong>{mealType.label}</strong><small>{meal.items.length ? `${totals.calories.toLocaleString("es-CL")} kcal · ${formatMacro(totals.protein_g)} proteína` : "Sin alimentos todavía"}</small></div>
                </div>
                <div className="meal-block__actions">
                  {hasPreviousMeal && (
                    <button type="button" className="meal-copy-button" onClick={() => copyPreviousMeal(mealType.id)} title="Copiar la última comida de este tipo"><Copy size={14} /></button>
                  )}
                  <button type="button" className="meal-add-button" onClick={() => { setActiveMeal(mealType.id); setCustomMode(false); }}><Plus size={15} /> Añadir</button>
                </div>
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
        <div className="meal-picker-backdrop" role="presentation" onMouseDown={closePicker}>
          <div className="meal-picker" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span className="card-kicker">{customMode ? "Crear comida personalizada" : `Añadir a ${MEAL_TYPES.find((meal) => meal.id === activeMeal)?.label}`}</span>
                <h3>{customMode ? "Construye tu receta" : "¿Qué comiste?"}</h3>
              </div>
              <button type="button" onClick={closePicker} aria-label="Cerrar"><X size={18} /></button>
            </header>

            {customMode && (
              <div className="custom-recipe-meta">
                <label><span>Nombre</span><input value={recipeName} onChange={(event) => setRecipeName(event.target.value)} placeholder="Ej: Mi arroz con pollo" /></label>
                <label><span>Porciones que rinde</span><input type="number" min="1" step="1" value={recipeServings} onChange={(event) => setRecipeServings(Math.max(1, Number(event.target.value) || 1))} /></label>
              </div>
            )}

            {!customMode && (
              <div className="meal-picker-tools">
                <button type="button" className={barcodeOpen ? "is-active" : ""} onClick={() => { setBarcodeOpen((value) => !value); stopCamera(); }}><ScanLine size={15} /> Código de barras</button>
                <button type="button" onClick={startCustomRecipe}><Plus size={15} /> Crear personalizada</button>
              </div>
            )}

            {barcodeOpen && !customMode && (
              <section className="barcode-panel">
                <div className="barcode-panel__row">
                  <label><span>Código</span><input inputMode="numeric" value={barcodeValue} onChange={(event) => setBarcodeValue(event.target.value.replace(/\D/g, ""))} placeholder="Ej: 7801234567890" /></label>
                  <button type="button" onClick={() => lookupBarcode()} disabled={barcodeLoading}>{barcodeLoading ? <Loader2 size={16} className="is-spinning" /> : <Search size={16} />} Buscar</button>
                  <button type="button" onClick={cameraActive ? stopCamera : startBarcodeCamera}><Camera size={16} /> {cameraActive ? "Cerrar cámara" : "Escanear"}</button>
                </div>
                {cameraActive && <video ref={videoRef} className="barcode-camera" playsInline muted />}
                <small>La cámara usa el detector del navegador cuando está disponible. También puedes escribir el número del código.</small>
              </section>
            )}

            <label className="meal-search-box">
              <Search size={17} />
              <input autoFocus={!barcodeOpen} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={customMode ? "Busca un ingrediente…" : "Ej: arroz, pollo, marraqueta, yogur…"} />
              {searchingRemote && <Loader2 size={16} className="is-spinning" />}
            </label>

            {!customMode && (
              <div className="meal-search-hint meal-search-hint--actions">
                <div><span>⭐ Favoritos · 🕘 Recientes · Mis comidas · Catálogo Treino</span><small>Los platos caseros marcados “aprox.” pueden variar según receta y cantidad.</small></div>
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

            <div className="meal-food-results meal-food-results--v15">
              {combinedFoods.map((food) => {
                const sample = createMealItem(food, 1);
                const selected = getFoodKey(selectedFood || {}) === getFoodKey(food);
                const favorite = isFavoriteFood(favoriteFoods, food);
                return (
                  <div key={getFoodKey(food)} className={`meal-food-result ${selected ? "is-selected" : ""}`}>
                    <button type="button" className="meal-food-result__select" onClick={() => { setSelectedFood(food); setPortions(1); }}>
                      <div><strong>{food.name}</strong><span>{food.portionLabel} · {food.portionGrams} g{food.estimated ? " · aprox." : ""}{food.source === "custom_recipe" ? " · Mis comidas" : ""}{favorite ? " · favorito" : recentFoods.some((item) => getFoodKey(item) === getFoodKey(food)) ? " · reciente" : ""}</span></div>
                      <div><strong>{sample.calories} kcal</strong><span>P {sample.protein_g} · C {sample.carbs_g} · G {sample.fat_g}</span></div>
                      {selected && <Check size={17} />}
                    </button>
                    {!customMode && (
                      <button type="button" className={`meal-favorite-button ${favorite ? "is-favorite" : ""}`} onClick={() => toggleFavorite(food)} aria-label={favorite ? `Quitar ${food.name} de favoritos` : `Agregar ${food.name} a favoritos`}><Star size={16} fill={favorite ? "currentColor" : "none"} /></button>
                    )}
                  </div>
                );
              })}
              {!combinedFoods.length && query.trim().length >= 2 && !searchingRemote && (
                <div className="meal-search-empty">No encontramos ese alimento todavía. {customMode ? "Prueba con otro nombre de ingrediente." : "Puedes crear una comida personalizada o probar su código de barras."}</div>
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
