// src/data/routineTemplates.js

export const ROUTINE_TEMPLATES = [
  {
    id: "empuje",
    label: "Rutina de Empuje (Push)",
    description: "Pecho, Hombros y Tríceps",
    emoji: "🔥",
    categories: [
      {
        name: "Pecho",
        exercises: [
          { name: "Press de Banca con Barra", sets: [{}, {}, {}] },
          { name: "Press Inclinado con Mancuernas", sets: [{}, {}] }
        ]
      },
      {
        name: "Hombros",
        exercises: [
          { name: "Press Militar", sets: [{}, {}, {}] },
          { name: "Elevaciones Laterales", sets: [{}, {}] }
        ]
      },
      {
        name: "Tríceps",
        exercises: [
          { name: "Fondos en Paralelas", sets: [{}, {}] }
        ]
      }
    ]
  },
  {
    id: "tiron",
    label: "Rutina de Tirón (Pull)",
    description: "Espalda, Bíceps y Deltoides Posterior",
    emoji: "⚡",
    categories: [
      {
        name: "Espalda",
        exercises: [
          { name: "Dominadas", sets: [{}, {}, {}] },
          { name: "Remo con Barra", sets: [{}, {}] }
        ]
      },
      {
        name: "Bíceps",
        exercises: [
          { name: "Curl de Bíceps con Barra", sets: [{}, {}] }
        ]
      }
    ]
  },
  {
    id: "pierna",
    label: "Rutina de Pierna (Legs)",
    description: "Cuádriceps, Isquios y Pantorrillas",
    emoji: "🍗",
    categories: [
      {
        name: "Piernas",
        exercises: [
          { name: "Sentadillas", sets: [{}, {}, {}] },
          { name: "Prensa de Piernas", sets: [{}, {}] }
        ]
      }
    ]
  },
  {
    id: "custom",
    label: "Entrenamiento Libre",
    description: "Arma tu sesión seleccionando los músculos al momento",
    emoji: "⚙️",
    categories: null
  }
];

// ... Todo tu arreglo de rutinas ROUTINE_TEMPLATES arriba igual

// Exportaciones duales a prueba de fallos mecánicos o de mayúsculas
export const routineTemplates = ROUTINE_TEMPLATES;
export default ROUTINE_TEMPLATES;