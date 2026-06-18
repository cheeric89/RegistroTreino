// src/hooks/usePRs.js
// Capa de acceso a datos de récords personales (PRs).
//
// ESTRATEGIA: la tabla `user_prs` en Supabase actúa como caché/lectura
// rápida, pero hoy nada la escribe todavía (ver nota en
// sql/001_user_control_center.sql sobre cómo sincronizarla). Por eso,
// si la consulta vuelve vacía o falla, calculamos los PRs al vuelo desde
// el historial de entrenamientos con getAllPRs() — la misma lógica pura
// que ya usa progressionEngine.js para detectar PRs al guardar.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { getAllWorkouts } from "../utils/storage";
import { getAllPRs } from "../utils/progressionEngine";

const TABLE = "user_prs";

export function usePRs() {
  const { user } = useAuth();
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const computeLocal = () => getAllPRs(getAllWorkouts());

    if (!user) {
      setPrs(computeLocal());
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("best_volume", { ascending: false });

    if (err) {
      console.warn("[usePRs] fetch falló, calculando localmente:", err.message);
      setError(err.message);
      setPrs(computeLocal());
    } else if (!data || data.length === 0) {
      // Tabla todavía sin sincronizar para este usuario → calculamos
      // desde el historial local en vez de mostrar una lista vacía.
      setPrs(computeLocal());
    } else {
      setPrs(data);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  return { prs, loading, error, fetchPRs };
}