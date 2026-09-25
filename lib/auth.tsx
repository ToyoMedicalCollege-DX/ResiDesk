"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient, hasSupabasePublicEnv } from "@/lib/supabase/client";
import { staffLoginToEmail } from "@/lib/staff-auth";
import type { StaffMe } from "@/lib/staff";

type AuthContextValue = {
  ready: boolean;
  session: StaffMe | null;
  configured: boolean;
  login: (staffId: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<StaffMe | null> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as StaffMe;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<StaffMe | null>(null);
  const configured = hasSupabasePublicEnv();

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (!cancelled) setSession(null);
        return;
      }
      const me = await fetchMe();
      if (!me) {
        await supabase.auth.signOut();
        if (!cancelled) setSession(null);
        return;
      }
      if (!cancelled) setSession(me);
    };

    void load().finally(() => {
      if (!cancelled) setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      configured,
      login: async (staffId, password) => {
        if (!configured) return "Supabase の環境変数が未設定です";
        const email = staffLoginToEmail(staffId);
        if (!email) return "社員番号を入力してください";
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/invalid login credentials/i.test(error.message)) {
            return "社員番号またはパスワードが違います";
          }
          return error.message;
        }
        const me = await fetchMe();
        if (!me) {
          await supabase.auth.signOut();
          return "教員アカウントではありません。学生アカウントでは入れません。";
        }
        setSession(me);
        return null;
      },
      logout: async () => {
        if (configured) {
          const supabase = createClient();
          await supabase.auth.signOut();
        }
        setSession(null);
      },
    }),
    [ready, session, configured]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
