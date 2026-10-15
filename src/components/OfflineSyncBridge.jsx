import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";
import { getAppointmentsRange, syncOfflineAppointments } from "../data/appointments";
import { getClients } from "../data/clients";
import { getServices } from "../data/services";
import { getProfile } from "../data/profile";
import { getPendingAppointments } from "../data/offlineStore";

export default function OfflineSyncBridge() {
  const { user } = useAuth();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const running = useRef(false);

  const refresh = useCallback(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    setPending(user?.id ? getPendingAppointments(user.id).length : 0);
  }, [user?.id]);

  const warmOfflineCache = useCallback(async () => {
    if (!user?.id || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    const start = new Date();
    start.setDate(start.getDate() - 14);
    const end = new Date();
    end.setDate(end.getDate() + 90);
    await Promise.allSettled([
      getClients(),
      getServices(),
      getProfile(user.id),
      getAppointmentsRange(start, end),
    ]);
  }, [user?.id]);

  const runSync = useCallback(async () => {
    if (!user?.id || running.current || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      refresh();
      return;
    }
    running.current = true;
    setSyncing(true);
    try {
      await syncOfflineAppointments();
    } catch {
      // Очередь остаётся на устройстве и будет повторена позже.
    } finally {
      running.current = false;
      setSyncing(false);
      refresh();
    }
  }, [user?.id, refresh]);

  useEffect(() => {
    if (!user?.id) {
      setPending(0);
      return;
    }
    refresh();
    runSync();
    warmOfflineCache();

    const onOnline = () => { setOnline(true); runSync(); warmOfflineCache(); };
    const onOffline = () => { setOnline(false); refresh(); };
    const onChange = () => { refresh(); if (navigator.onLine) runSync(); };
    const onVisible = () => { if (document.visibilityState === "visible") runSync(); };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("ritena:offline-change", onChange);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine && getPendingAppointments(user.id).length) runSync();
    }, 30000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("ritena:offline-change", onChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [user?.id, refresh, runSync, warmOfflineCache]);

  if (!user?.id) return null;
  if (online && !pending && !syncing) return null;

  const text = !online
    ? pending
      ? `Офлайн · ${pending} ${pending === 1 ? "запись сохранена" : "записи сохранены"} на устройстве`
      : "Офлайн · новые записи сохранятся на устройстве"
    : syncing
      ? `Синхронизация${pending ? ` · осталось ${pending}` : "…"}`
      : `${pending} ${pending === 1 ? "запись ожидает" : "записи ожидают"} отправки`;

  return (
    <div className="fixed left-1/2 top-2 z-[100] -translate-x-1/2 max-w-[calc(100%-24px)] rounded-full px-3.5 py-2 text-xs font-medium shadow-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]">
      {text}
    </div>
  );
}
