import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AuthContextValue } from "./auth-context";

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error("Ocorreu um erro inesperado na autenticação.");

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      // INITIAL_SESSION and PASSWORD_RECOVERY both arrive after URL processing.
      // The recovery link already targets /auth?mode=reset.
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const verifySession = () => {
      void supabase.auth.getUser().then(({ error }) => {
        if (error && (error.status === 401 || error.name === "AuthSessionMissingError")) {
          void supabase.auth.signOut({ scope: "local" });
        }
      }).catch(() => undefined);
    };
    window.addEventListener("focus", verifySession);
    verifySession();
    return () => window.removeEventListener("focus", verifySession);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signUp: async (email, password, fullName) => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/planejar`,
              data: { full_name: fullName.trim() },
            },
          });

          return { error, session: data.session };
        } catch (error) {
          return { error: toError(error), session: null };
        }
      },
      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          return { error, session: data.session };
        } catch (error) {
          return { error: toError(error), session: null };
        }
      },
      signOut: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          return { error };
        } catch (error) {
          return { error: toError(error) };
        }
      },
    }),
    [loading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
