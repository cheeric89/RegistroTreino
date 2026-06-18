// src/hooks/useProfile.js
// Capa de acceso a datos del perfil — mismo patrón que useWorkouts.js:
// Supabase como fuente principal, localStorage como fallback/caché.
//
// SUPABASE TABLE SCHEMA: ver sql/001_user_control_center.sql
//   tabla public.user_stats, una fila por usuario (unique en user_id)

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { getLocalProfile, saveLocalProfile } from "../utils/storage";

const TABLE = "user_stats";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /** Carga el perfil del usuario actual (Supabase, con fallback local) */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!user) {
      // Sin sesión: no debería pasar en el flujo normal de la app (el
      // auth gate de App.jsx ya exige login), pero lo cubrimos por
      // si en el futuro se habilita un modo invitado.
      setProfile(getLocalProfile());
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (err) {
      console.warn("[useProfile] fetch falló, usando caché local:", err.message);
      setError(err.message);
      setProfile(getLocalProfile());
    } else {
      // data === null la primera vez (todavía no existe la fila)
      setProfile(data ?? getLocalProfile());
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /** Guarda (upsert) los campos editados del perfil */
  const saveProfile = useCallback(
    async (updates) => {
      setSaving(true);

      // Caché local siempre se actualiza primero (instantáneo, funciona offline)
      const merged = { ...profile, ...updates };
      saveLocalProfile(merged);

      if (!user) {
        setProfile(merged);
        setSaving(false);
        return { error: null };
      }

      const { data, error: err } = await supabase
        .from(TABLE)
        .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
        .select()
        .single();

      setSaving(false);

      if (err) {
        console.warn("[useProfile] guardado falló:", err.message);
        return { error: err.message };
      }

      setProfile(data);
      return { error: null };
    },
    [user, profile]
  );

  return { profile, loading, saving, error, fetchProfile, saveProfile };
}