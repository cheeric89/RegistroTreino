const exercise = (name, sets = 3, repMin = 8, repMax = 12, restSeconds = 120, warmupSets = 1) => ({
  name,
  sets,
  repMin,
  repMax,
  restSeconds,
  warmupSets,
  autoRest: true,
});

export const ROUTINE_PRESETS = [
  {
    id: "upper",
    name: "Upper",
    emoji: "⬆️",
    description: "Torso completo · fuerza e hipertrofia",
    categories: [
      {
        name: "Pecho",
        exercises: [
          exercise("Press de Banca con Barra", 3, 6, 10, 180, 2),
          exercise("Press Inclinado con Mancuernas", 3, 8, 12, 150, 1),
        ],
      },
      {
        name: "Espalda",
        exercises: [
          exercise("Jalón al Pecho", 3, 8, 12, 120, 1),
          exercise("Remo en Máquina", 3, 8, 12, 120, 1),
        ],
      },
      {
        name: "Hombros",
        exercises: [exercise("Elevaciones Laterales", 3, 12, 20, 75, 1)],
      },
      {
        name: "Brazos",
        exercises: [
          exercise("Curl Martillo", 2, 8, 12, 90, 0),
          exercise("Extensión de Tríceps", 2, 10, 15, 90, 0),
        ],
      },
    ],
  },
  {
    id: "lower",
    name: "Lower",
    emoji: "⬇️",
    description: "Piernas completas · cuádriceps, isquios y glúteos",
    categories: [
      {
        name: "Piernas",
        exercises: [
          exercise("Sentadilla", 3, 6, 10, 210, 2),
          exercise("Prensa de Piernas", 3, 8, 12, 150, 2),
          exercise("Curl Femoral", 3, 10, 15, 90, 1),
          exercise("Extensión de Cuádriceps", 3, 10, 15, 90, 1),
          exercise("Elevación de Gemelos", 3, 10, 20, 75, 0),
        ],
      },
    ],
  },
  {
    id: "full-body",
    name: "Full Body",
    emoji: "🌐",
    description: "Cuerpo completo en una sola sesión",
    categories: [
      { name: "Piernas", exercises: [exercise("Sentadilla", 3, 6, 10, 180, 2)] },
      { name: "Pecho", exercises: [exercise("Press de Banca con Barra", 3, 6, 10, 180, 2)] },
      { name: "Espalda", exercises: [exercise("Jalón al Pecho", 3, 8, 12, 120, 1)] },
      { name: "Hombros", exercises: [exercise("Elevaciones Laterales", 2, 12, 20, 75, 0)] },
      {
        name: "Brazos",
        exercises: [
          exercise("Curl Martillo", 2, 8, 12, 75, 0),
          exercise("Extensión de Tríceps", 2, 10, 15, 75, 0),
        ],
      },
    ],
  },
  {
    id: "arnold-chest-back",
    name: "Arnold · Pecho/Espalda",
    emoji: "🏛️",
    description: "Pecho y espalda en la misma sesión",
    categories: [
      {
        name: "Pecho",
        exercises: [
          exercise("Press de Banca con Barra", 3, 6, 10, 180, 2),
          exercise("Press Inclinado con Mancuernas", 3, 8, 12, 150, 1),
        ],
      },
      {
        name: "Espalda",
        exercises: [
          exercise("Jalón al Pecho", 3, 8, 12, 120, 1),
          exercise("Remo con Barra", 3, 6, 10, 180, 2),
        ],
      },
    ],
  },
  {
    id: "arnold-arms-shoulders",
    name: "Arnold · Hombros/Brazos",
    emoji: "⚡",
    description: "Hombros, bíceps y tríceps",
    categories: [
      {
        name: "Hombros",
        exercises: [
          exercise("Press Militar", 3, 6, 10, 150, 2),
          exercise("Elevaciones Laterales", 3, 12, 20, 75, 0),
        ],
      },
      {
        name: "Bíceps",
        exercises: [exercise("Curl de Bíceps con Barra", 3, 8, 12, 90, 1)],
      },
      {
        name: "Tríceps",
        exercises: [exercise("Extensión de Tríceps", 3, 10, 15, 90, 1)],
      },
    ],
  },
  {
    id: "blank",
    name: "Rutina personalizada",
    emoji: "✨",
    description: "Empieza desde cero y crea tu propia estructura",
    categories: [
      {
        name: "Grupo muscular",
        exercises: [exercise("", 3, 8, 12, 120, 0)],
      },
    ],
  },
];

export const createRoutineFromPreset = (preset, suffix = Date.now()) => ({
  type: `custom-${preset.id}-${suffix}`,
  name: preset.name,
  emoji: preset.emoji || "💪",
  description: preset.description || "Rutina personalizada",
  categories: (preset.categories || []).map((category) => ({
    ...category,
    exercises: (category.exercises || []).map((item) => ({ ...item })),
  })),
});
