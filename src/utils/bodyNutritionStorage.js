const bodyKey = (userId) => `treino_body_entries:${userId || "guest"}`;
const nutritionKey = (userId) => `treino_nutrition_entries:${userId || "guest"}`;
const queueKey = (userId) => `treino_body_nutrition_queue:${userId || "guest"}`;

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const sortByDate = (entries = []) => [...entries].sort((a, b) =>
  String(b?.entry_date || "").localeCompare(String(a?.entry_date || ""))
);

const mergeByDate = (...collections) => {
  const map = new Map();
  collections.flat().forEach((entry) => {
    const date = String(entry?.entry_date || "");
    if (!date) return;
    map.set(date, { ...entry, entry_date: date });
  });
  return sortByDate([...map.values()]);
};

export const getLocalBodyEntries = (userId) => sortByDate(readJSON(bodyKey(userId), []));
export const getLocalNutritionEntries = (userId) => sortByDate(readJSON(nutritionKey(userId), []));

export const replaceLocalBodyEntries = (userId, entries) =>
  writeJSON(bodyKey(userId), sortByDate(entries));

export const replaceLocalNutritionEntries = (userId, entries) =>
  writeJSON(nutritionKey(userId), sortByDate(entries));

export const upsertLocalBodyEntry = (userId, entry) => {
  const next = mergeByDate(getLocalBodyEntries(userId), [entry]);
  replaceLocalBodyEntries(userId, next);
  return next;
};

export const upsertLocalNutritionEntry = (userId, entry) => {
  const next = mergeByDate(getLocalNutritionEntries(userId), [entry]);
  replaceLocalNutritionEntries(userId, next);
  return next;
};

export const getBodyNutritionQueue = (userId) => readJSON(queueKey(userId), []);

export const queueBodyNutritionOperation = (userId, operation) => {
  if (!operation?.kind || !operation?.entry?.entry_date) return false;
  const queue = getBodyNutritionQueue(userId).filter(
    (item) => !(item.kind === operation.kind && item.entry?.entry_date === operation.entry.entry_date)
  );
  queue.push({ ...operation, queuedAt: Date.now() });
  return writeJSON(queueKey(userId), queue);
};

export const removeBodyNutritionOperation = (userId, kind, entryDate) => {
  const queue = getBodyNutritionQueue(userId).filter(
    (item) => !(item.kind === kind && item.entry?.entry_date === entryDate)
  );
  return writeJSON(queueKey(userId), queue);
};

export const mergeBodyNutritionEntries = mergeByDate;
