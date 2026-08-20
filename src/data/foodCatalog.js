export const FOOD_CATALOG = [
  { id: "rice-cooked", name: "Arroz blanco cocido", aliases: ["arroz", "arroz blanco"], category: "Carbohidratos", kcal100: 130, protein100: 2.7, carbs100: 28.2, fat100: 0.3, portionLabel: "1 taza", portionGrams: 160 },
  { id: "pasta-cooked", name: "Pasta cocida", aliases: ["fideos", "tallarines", "pasta"], category: "Carbohidratos", kcal100: 157, protein100: 5.8, carbs100: 30.9, fat100: 0.9, portionLabel: "1 plato pequeño", portionGrams: 180 },
  { id: "potato-boiled", name: "Papa cocida", aliases: ["papa", "papas cocidas"], category: "Carbohidratos", kcal100: 87, protein100: 1.9, carbs100: 20.1, fat100: 0.1, portionLabel: "1 papa mediana", portionGrams: 150 },
  { id: "oats", name: "Avena", aliases: ["avena cruda", "avena tradicional"], category: "Carbohidratos", kcal100: 389, protein100: 16.9, carbs100: 66.3, fat100: 6.9, portionLabel: "1 porción", portionGrams: 40 },
  { id: "marraqueta", name: "Marraqueta", aliases: ["pan batido", "pan frances", "pan francés"], category: "Pan", kcal100: 270, protein100: 8.8, carbs100: 55, fat100: 1.6, portionLabel: "1/2 marraqueta", portionGrams: 50, estimated: true },
  { id: "hallulla", name: "Hallulla", aliases: ["pan hallulla"], category: "Pan", kcal100: 310, protein100: 8.2, carbs100: 53, fat100: 7.5, portionLabel: "1 unidad", portionGrams: 70, estimated: true },
  { id: "chicken-breast", name: "Pechuga de pollo cocida", aliases: ["pollo", "pechuga", "pechuga de pollo"], category: "Proteínas", kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6, portionLabel: "1 filete", portionGrams: 150 },
  { id: "beef-lean", name: "Carne de vacuno magra cocida", aliases: ["carne", "vacuno", "bistec"], category: "Proteínas", kcal100: 217, protein100: 26.1, carbs100: 0, fat100: 11.8, portionLabel: "1 bistec", portionGrams: 150, estimated: true },
  { id: "turkey-breast", name: "Pechuga de pavo cocida", aliases: ["pavo"], category: "Proteínas", kcal100: 135, protein100: 29, carbs100: 0, fat100: 1.6, portionLabel: "1 filete", portionGrams: 150 },
  { id: "tuna-water", name: "Atún al agua drenado", aliases: ["atun", "atún", "atun al agua"], category: "Proteínas", kcal100: 116, protein100: 25.5, carbs100: 0, fat100: 0.8, portionLabel: "1 lata", portionGrams: 120 },
  { id: "egg", name: "Huevo", aliases: ["huevo entero", "huevos"], category: "Proteínas", kcal100: 143, protein100: 12.6, carbs100: 0.7, fat100: 9.5, portionLabel: "1 unidad", portionGrams: 50 },
  { id: "lentils-cooked", name: "Lentejas cocidas", aliases: ["lentejas"], category: "Legumbres", kcal100: 116, protein100: 9, carbs100: 20.1, fat100: 0.4, portionLabel: "1 taza", portionGrams: 180 },
  { id: "beans-cooked", name: "Porotos cocidos", aliases: ["porotos", "frijoles"], category: "Legumbres", kcal100: 127, protein100: 8.7, carbs100: 22.8, fat100: 0.5, portionLabel: "1 taza", portionGrams: 170 },
  { id: "milk-semi", name: "Leche semidescremada", aliases: ["leche"], category: "Lácteos", kcal100: 46, protein100: 3.4, carbs100: 4.8, fat100: 1.5, portionLabel: "1 vaso", portionGrams: 200 },
  { id: "yogurt-natural", name: "Yogur natural", aliases: ["yogur", "yogurt"], category: "Lácteos", kcal100: 63, protein100: 5.3, carbs100: 7, fat100: 1.6, portionLabel: "1 pote", portionGrams: 125, estimated: true },
  { id: "cheese-gauda", name: "Queso gauda", aliases: ["queso", "gauda"], category: "Lácteos", kcal100: 356, protein100: 25, carbs100: 2.2, fat100: 27.4, portionLabel: "1 lámina", portionGrams: 25, estimated: true },
  { id: "ham", name: "Jamón de pavo", aliases: ["jamon", "jamón"], category: "Proteínas", kcal100: 110, protein100: 17, carbs100: 3, fat100: 3, portionLabel: "2 láminas", portionGrams: 30, estimated: true },
  { id: "banana", name: "Plátano", aliases: ["platano", "banana"], category: "Frutas", kcal100: 89, protein100: 1.1, carbs100: 22.8, fat100: 0.3, portionLabel: "1 unidad mediana", portionGrams: 120 },
  { id: "apple", name: "Manzana", aliases: ["manzana roja", "manzana verde"], category: "Frutas", kcal100: 52, protein100: 0.3, carbs100: 13.8, fat100: 0.2, portionLabel: "1 unidad mediana", portionGrams: 180 },
  { id: "avocado", name: "Palta", aliases: ["aguacate", "palta hass"], category: "Grasas", kcal100: 160, protein100: 2, carbs100: 8.5, fat100: 14.7, portionLabel: "1/2 palta", portionGrams: 75 },
  { id: "peanut-butter", name: "Mantequilla de maní", aliases: ["mantequilla de mani", "peanut butter"], category: "Grasas", kcal100: 588, protein100: 25, carbs100: 20, fat100: 50, portionLabel: "1 cucharada", portionGrams: 15, estimated: true },
  { id: "olive-oil", name: "Aceite de oliva", aliases: ["aceite"], category: "Grasas", kcal100: 884, protein100: 0, carbs100: 0, fat100: 100, portionLabel: "1 cucharada", portionGrams: 14 },
  { id: "whey", name: "Proteína whey", aliases: ["whey", "proteina en polvo", "proteína en polvo"], category: "Suplementos", kcal100: 400, protein100: 80, carbs100: 8, fat100: 6, portionLabel: "1 scoop", portionGrams: 30, estimated: true },
  { id: "rice-chicken-plate", name: "Arroz con pollo (plato casero)", aliases: ["arroz con pollo"], category: "Platos", kcal100: 155, protein100: 10.5, carbs100: 19, fat100: 3.6, portionLabel: "1 plato", portionGrams: 350, estimated: true },
  { id: "lentil-stew", name: "Lentejas con arroz (plato casero)", aliases: ["lentejas con arroz", "guiso de lentejas"], category: "Platos", kcal100: 135, protein100: 6.3, carbs100: 22, fat100: 2.2, portionLabel: "1 plato", portionGrams: 350, estimated: true },
  { id: "cazuela-chicken", name: "Cazuela de pollo (plato casero)", aliases: ["cazuela", "cazuela de pollo"], category: "Platos", kcal100: 85, protein100: 6.5, carbs100: 8, fat100: 3, portionLabel: "1 plato", portionGrams: 450, estimated: true },
];

const normalize = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim();

export const searchFoodCatalog = (query = "") => {
  const normalized = normalize(query);
  if (!normalized) return FOOD_CATALOG.slice(0, 10);

  return FOOD_CATALOG
    .map((food) => {
      const haystack = [food.name, food.category, ...(food.aliases || [])].map(normalize);
      const exact = haystack.some((value) => value === normalized);
      const starts = haystack.some((value) => value.startsWith(normalized));
      const includes = haystack.some((value) => value.includes(normalized));
      return { food, score: exact ? 3 : starts ? 2 : includes ? 1 : 0 };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, "es"))
    .map((item) => item.food)
    .slice(0, 12);
};
