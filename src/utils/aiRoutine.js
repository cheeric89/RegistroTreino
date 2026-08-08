import { supabase } from "../lib/supabase";

const normalizeErrorMessage = (error) => {
  if (!error) return "No se pudo generar la rutina.";
  const message = error?.message || String(error);

  if (/non-2xx|edge function/i.test(message)) {
    return "Treino AI todavía no está disponible. Revisa que la Edge Function esté desplegada y configurada.";
  }

  return message;
};

export async function generateAIRoutinePlan(payload) {
  const { data, error } = await supabase.functions.invoke("generate-routine", {
    body: payload,
  });

  if (error) {
    throw new Error(normalizeErrorMessage(error));
  }

  if (!data?.plan?.routines?.length) {
    throw new Error(data?.error || "La IA no devolvió una rutina válida.");
  }

  return {
    plan: data.plan,
    usage: data.usage || null,
  };
}
