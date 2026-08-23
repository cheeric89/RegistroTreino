const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseServingGrams = (product = {}) => {
  const direct = Number(product.serving_quantity);
  if (Number.isFinite(direct) && direct > 0 && direct <= 1000) return direct;
  const match = String(product.serving_size || "").match(/([\d.,]+)\s*g\b/i);
  if (!match) return 100;
  const grams = Number(match[1].replace(",", "."));
  return Number.isFinite(grams) && grams > 0 ? grams : 100;
};

const toFood = (product = {}) => {
  const nutrients = product.nutriments || {};
  const name = String(product.product_name || "").trim();
  if (!name) return null;

  const kcal = num(nutrients["energy-kcal_100g"] ?? nutrients["energy-kcal"]);
  const protein = num(nutrients.proteins_100g);
  const carbs = num(nutrients.carbohydrates_100g);
  const fat = num(nutrients.fat_100g);
  if (![kcal, protein, carbs, fat].some((value) => value > 0)) return null;

  return {
    id: `off-${product.code || name}`,
    name: product.brands ? `${name} · ${product.brands}` : name,
    aliases: [],
    category: "Producto envasado",
    kcal100: Math.round(kcal),
    protein100: protein,
    carbs100: carbs,
    fat100: fat,
    portionLabel: product.serving_size ? `1 porción (${product.serving_size})` : "100 g",
    portionGrams: parseServingGrams(product),
    estimated: false,
    source: "open_food_facts",
    barcode: product.code || null,
  };
};

const PRODUCT_FIELDS = "code,product_name,brands,nutriments,serving_size,serving_quantity";

export async function searchOpenFoodFacts(query, { signal } = {}) {
  const term = String(query || "").trim();
  if (term.length < 3) return [];

  const params = new URLSearchParams({
    search_terms: term,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "8",
    fields: PRODUCT_FIELDS,
  });

  try {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
      method: "GET",
      signal,
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.products || []).map(toFood).filter(Boolean).slice(0, 8);
  } catch (error) {
    if (error?.name === "AbortError") return [];
    console.warn("[Treino] Open Food Facts no disponible:", error?.message || error);
    return [];
  }
}

export async function getOpenFoodFactsByBarcode(barcode, { signal } = {}) {
  const code = String(barcode || "").replace(/\D/g, "");
  if (code.length < 8 || code.length > 14) return null;

  try {
    const params = new URLSearchParams({ fields: PRODUCT_FIELDS });
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?${params.toString()}`, {
      method: "GET",
      signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 1 || !data.product) return null;
    return toFood({ ...data.product, code: data.product.code || code });
  } catch (error) {
    if (error?.name === "AbortError") return null;
    console.warn("[Treino] búsqueda por código no disponible:", error?.message || error);
    return null;
  }
}
