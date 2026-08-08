const CONNECTOR_WORDS = new Set([
  "con",
  "de",
  "del",
  "al",
  "el",
  "la",
  "los",
  "las",
  "en",
]);

const TOKEN_ALIASES = new Map([
  ["mancuernas", "mancuerna"],
  ["poleas", "polea"],
  ["maquinas", "maquina"],
  ["barras", "barra"],
  ["discos", "disco"],
]);

const cleanText = (value = "") =>
  String(value)
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Convierte variantes razonables del mismo ejercicio a una clave estable.
 *
 * Ejemplos:
 * - "Press Inclinado con Mancuernas" -> "press inclinado mancuerna"
 * - "press inclinado mancuernas"     -> "press inclinado mancuerna"
 * - "Jalón al Pecho"                 -> "jalon pecho"
 * - "jalon al pecho"                 -> "jalon pecho"
 *
 * Es intencionalmente conservador: no usa fuzzy matching para evitar unir
 * ejercicios distintos que solo tengan nombres parecidos.
 */
export function normalizeExerciseName(value = "") {
  const cleaned = cleanText(value);
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .filter(Boolean)
    .filter((token) => !CONNECTOR_WORDS.has(token))
    .map((token) => TOKEN_ALIASES.get(token) || token)
    .join(" ");
}

export function areExerciseNamesEquivalent(a, b) {
  const left = normalizeExerciseName(a);
  const right = normalizeExerciseName(b);
  return Boolean(left && right && left === right);
}

const displayNameScore = (value = "") => {
  const trimmed = String(value).trim();
  if (!trimmed) return -Infinity;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const capitalizedWords = words.filter((word) => /^[A-ZÁÉÍÓÚÑ]/.test(word)).length;
  const startsCapitalized = /^[A-ZÁÉÍÓÚÑ]/.test(trimmed) ? 4 : 0;
  const connectorBonus = words.filter((word) =>
    ["con", "de", "del", "al", "en"].includes(cleanText(word))
  ).length;

  // Preferimos nombres bien formateados y descriptivos para mostrar en UI,
  // aunque varias escrituras compartan la misma clave canónica.
  return startsCapitalized + capitalizedWords * 2 + connectorBonus + trimmed.length / 100;
};

export function choosePreferredExerciseName(currentName, candidateName) {
  const current = String(currentName || "").trim();
  const candidate = String(candidateName || "").trim();

  if (!current) return candidate;
  if (!candidate) return current;

  return displayNameScore(candidate) > displayNameScore(current) ? candidate : current;
}
