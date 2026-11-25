import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getProfileName, PROFILE_CHANGED_EVENT, type ProfileChange } from "./api";

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<{ userId: string; fullName: string | null } | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!userId) { setProfile(null); setLoading(false); setError(false); return; }
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(false);
    void getProfileName(userId, controller.signal).then((fullName) => {
      if (!controller.signal.aborted) setProfile({ userId, fullName });
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [userId, revision]);

  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<ProfileChange>).detail;
      if (detail.userId !== userId) return;
      controllerRef.current?.abort();
      setProfile(detail);
      setLoading(false);
      setError(false);
    };
    window.addEventListener(PROFILE_CHANGED_EVENT, changed);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, changed);
  }, [userId]);

  return { fullName: profile?.userId === userId ? profile?.fullName ?? null : null, loading, error, refresh };
}
