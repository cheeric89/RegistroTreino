import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { getLocalProfile, saveLocalProfile } from "../utils/storage";

const TABLE = "profiles";

const cachedProfileForUser = (user) => {
  const cached = getLocalProfile();
  if (!cached) return null;
  if (!user?.id) return cached;
  return cached?.id === user.id ? cached : null;
};

export function useProfile() {
  const { user } = useAuth();
  const initialCache = cachedProfileForUser(user);
  const [profile, setProfile] = useState(initialCache);
  const [loading, setLoading] = useState(!initialCache);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cachedProfile = useMemo(() => cachedProfileForUser(user), [user?.id]);
  const visibleProfile = user?.id
    ? (profile?.id === user.id ? profile : cachedProfile)
    : profile;

  const fetchProfile = useCallback(async () => {
    setError(null);

    if (!user) {
      const local = getLocalProfile();
      setProfile(local);
      setLoading(false);
      return;
    }

    const local = cachedProfileForUser(user);
    if (local) {
      setProfile(local);
      setLoading(false);
    } else {
      setProfile(null);
      setLoading(true);
    }

    const { data, error: err } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (err) {
      console.warn("[useProfile] fetch falló, usando caché local:", err.message);
      setError(err.message);
      if (local) setProfile(local);
    } else if (data) {
      setProfile(data);
      saveLocalProfile(data);
    } else if (local) {
      setProfile(local);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (updates) => {
      setSaving(true);
      const baseProfile = visibleProfile || cachedProfileForUser(user) || {};
      const merged = { ...baseProfile, ...updates };

      if (user?.id) merged.id = user.id;
      saveLocalProfile(merged);
      setProfile(merged);

      if (!user) {
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
        setError(err.message);
        return { error: err.message };
      }

      setProfile(data);
      setError(null);
      saveLocalProfile(data);
      return { error: null };
    },
    [user, visibleProfile]
  );

  return {
    profile: visibleProfile,
    loading,
    saving,
    error,
    fetchProfile,
    saveProfile,
  };
}
