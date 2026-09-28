import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
export interface Credits { balance: number; initialCredits: number; pending: boolean }
export const refreshCredits = () => window.dispatchEvent(new Event("credits-changed"));
export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => { setCredits(null); }, [user?.id]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const fetchCredits = async () => {
      const { data, error } = await supabase.rpc("generation_credit_summary");
      if (!active) return;
      if (error || !data || typeof data !== "object" || Array.isArray(data) || typeof data.balance !== "number") {
        setError(true); setCredits(null); return;
      }
      setCredits({ balance: data.balance, initialCredits: Number(data.initialCredits), pending: data.pending === true });
      setError(false);
    };
    void fetchCredits().catch(() => { if (active) { setError(true); setCredits(null); } });
    return () => { active = false; };
  }, [user, revision]);
  useEffect(() => {
    window.addEventListener("credits-changed", refresh);
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 30_000);
    return () => { window.removeEventListener("credits-changed", refresh); window.removeEventListener("focus", refresh); window.clearInterval(interval); };
  }, [refresh]);
  return { credits, error, refresh };
}
