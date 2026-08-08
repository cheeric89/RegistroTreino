export const DEFAULT_ROUTINES = [
  {
    type: "push",
    name: "Push",
    emoji: "🔥",
    description: "Pecho · Hombros · Tríceps",
    categories: [
      {
        name: "Pecho",
        exercises: [
          { name: "Press de Banca con Barra", sets: 3 },
          { name: "Press Inclinado con Mancuernas", sets: 3 },
        ],
      },
      {
        name: "Hombros",
        exercises: [
          { name: "Press Militar", sets: 3 },
          { name: "Elevaciones Laterales", sets: 3 },
        ],
      },
      {
        name: "Tríceps",
        exercises: [{ name: "Extensión de Tríceps", sets: 3 }],
      },
    ],
  },
  {
    type: "pull",
    name: "Pull",
    emoji: "⚡",
    description: "Espalda · Bíceps",
    categories: [
      {
        name: "Espalda",
        exercises: [
          { name: "Jalón al Pecho", sets: 3 },
          { name: "Remo con Barra", sets: 3 },
          { name: "Remo en Máquina", sets: 3 },
        ],
      },
      {
        name: "Bíceps",
        exercises: [
          { name: "Curl Martillo", sets: 3 },
          { name: "Curl de Bíceps con Barra", sets: 3 },
        ],
      },
    ],
  },
  {
    type: "legs",
    name: "Legs",
    emoji: "🦵",
    description: "Cuádriceps · Isquios · Glúteos · Gemelos",
    categories: [
      {
        name: "Piernas",
        exercises: [
          { name: "Sentadilla", sets: 3 },
          { name: "Prensa de Piernas", sets: 3 },
          { name: "Extensión de Cuádriceps", sets: 3 },
          { name: "Curl Femoral", sets: 3 },
          { name: "Elevación de Gemelos", sets: 3 },
        ],
      },
    ],
  },
];

export const cloneDefaultRoutines = () =>
  DEFAULT_ROUTINES.map((routine) => ({
    ...routine,
    categories: routine.categories.map((category) => ({
      ...category,
      exercises: category.exercises.map((exercise) => ({ ...exercise })),
    })),
  }));

export const getDefaultRoutine = (type) =>
  cloneDefaultRoutines().find((routine) => routine.type === type) || null;
