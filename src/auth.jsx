import React, { createContext, useContext, useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "./lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = ещё не знаем, null = не вошёл

  useEffect(() => {
    let alive = true;
    let appStateHandle = null;

    async function syncSession(forceRefresh = false) {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;
      if (error || !data?.session) {
        setSession(null);
        return;
      }

      const current = data.session;
      const expiresAtMs = Number(current.expires_at || 0) * 1000;
      const expiresSoon = !expiresAtMs || expiresAtMs - Date.now() < 2 * 60 * 1000;

      if (forceRefresh || expiresSoon) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (!alive) return;
        if (!refreshError && refreshed?.session) {
          setSession(refreshed.session);
          return;
        }
      }

      setSession(current);
    }

    syncSession(false);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (alive) setSession(s);
    });

    if (Capacitor.isNativePlatform()) {
      // В Capacitor WebView браузерные visibility-события могут приходить не так,
      // как в обычной вкладке. Управляем обновлением сессии по lifecycle приложения.
      supabase.auth.startAutoRefresh();
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          supabase.auth.startAutoRefresh();
          syncSession(true);
        } else {
          supabase.auth.stopAutoRefresh();
        }
      }).then((handle) => {
        if (alive) appStateHandle = handle;
        else handle.remove();
      });
    }

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
      appStateHandle?.remove();
      if (Capacitor.isNativePlatform()) supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = {
    session,
    user: session?.user || null,
    loading: session === undefined,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
