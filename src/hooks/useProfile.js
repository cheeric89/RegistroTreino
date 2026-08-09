import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { getLocalProfile, saveLocalProfile } from "../utils/storage";

const TABLE = "profiles";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!user) {
      setProfile(getLocalProfile());
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (err) {
      console.warn("[useProfile] fetch falló, usando caché local:", err.message);
      setError(err.message);
      setProfile(getLocalProfile());
    } else {
      setProfile(data ?? getLocalProfile());
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (updates) => {
      setSaving(true);
      const merged = { ...profile, ...updates };
      saveLocalProfile(merged);

      if (!user) {
        setProfile(merged);
        setSaving(false);
        return { error: null };
      }

      const { data, error: err } = await supabase
        .from(TABLE)
        .upsert({ id: user.id, ...updates }, { onConflict: "id" })
        .select()
        .single();

      setSaving(false);

      if (err) {
        console.warn("[useProfile] guardado falló:", err.message);
        setProfile(merged);
        setError(err.message);
        return { error: err.message };
      }

      setProfile(data);
      setError(null);
      saveLocalProfile(data);
      return { error: null };
    },
    [user, profile]
  );

  return { profile, loading, saving, error, fetchProfile, saveProfile };
}
