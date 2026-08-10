import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, CalendarDays, Users, Wallet, Settings, X, Check } from "lucide-react";
import { getProfile, updateProfile } from "../data/profile";
import { useAuth } from "../auth";

const NAV = [
  { to: "/", label: "Главная", Icon: LayoutGrid },
  { to: "/calendar", label: "Календарь", Icon: CalendarDays },
  { to: "/clients", label: "Клиенты", Icon: Users },
  { to: "/finance", label: "Финансы", Icon: Wallet },
  { to: "/settings", label: "Настройки", Icon: Settings },
];

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readCalendarDate() {
  try {
    const saved = localStorage.getItem("zenflow-calendar-selected-date");
    if (!saved) return new Date();
    const d = new Date(`${saved}T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

function normalizeSchedule(value) {
  if (Array.isArray(value)) return { weekly: value, dates: {} };
  return {
    weekly: value?.weekly || [],
    dates: value?.dates && typeof value.dates === "object" ? value.dates : {},
  };
}

function weekdayKey(d) {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
}

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [calendarDate, setCalendarDate] = useState(readCalendarDate);
  const [schedule, setSchedule] = useState(null);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("22:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || location.pathname !== "/calendar") return;
    let dead = false;
    getProfile(user.id).then((p) => { if (!dead) setSchedule(normalizeSchedule(p?.working_hours)); }).catch(() => {});
    return () => { dead = true; };
  }, [user, location.pathname]);

  useEffect(() => {
    if (location.pathname !== "/calendar") return;
    const sync = () => setCalendarDate(readCalendarDate());
    sync();
    const id = window.setInterval(sync, 300);
    return () => window.clearInterval(id);
  }, [location.pathname]);

  const selectedKey = fmtDate(calendarDate);
  const isDayOff = useMemo(() => {
    if (!schedule) return false;
    const weekly = schedule.weekly || [];
    const base = weekly.find((d) => d.key === weekdayKey(calendarDate));
    const value = schedule.dates[selectedKey] ? { ...(base || {}), ...schedule.dates[selectedKey] } : base;
    return !value?.on;
  }, [schedule, calendarDate, selectedKey]);

  function openHours() {
    const weekly = schedule?.weekly || [];
    const base = weekly.find((d) => d.key === weekdayKey(calendarDate));
    setStart(schedule?.dates?.[selectedKey]?.start || base?.start || "10:00");
    setEnd(schedule?.dates?.[selectedKey]?.end || base?.end || "22:00");
    setHoursOpen(true);
  }

  async function saveHours() {
    if (!user || !start || !end || start >= end) return;
    setSaving(true);
    try {
      const next = {
        ...(schedule || { weekly: [], dates: {} }),
        dates: {
          ...((schedule && schedule.dates) || {}),
          [selectedKey]: { on: true, start, end, breakStart: null, breakEnd: null },
        },
      };
      await updateProfile(user.id, { working_hours: next });
      setSchedule(next);
      setHoursOpen(false);
    } catch {
      window.alert("Не удалось сохранить рабочее время. Проверь подключение.");
    } finally {
      setSaving(false);
    }
  }

  const nav = (
    <>
      {location.pathname === "/calendar" && isDayOff && !hoursOpen && (
        <button
          onClick={openHours}
          className="fixed z-[2147483647] bottom-[76px] left-1/2 -translate-x-1/2 rounded-full px-4 py-2.5 text-xs font-medium shadow-[0_6px_20px_rgba(0,0,0,0.14)] border border-[var(--line)]"
          style={{ backgroundColor: "var(--surface)", color: "var(--moss)" }}
        >
          Задать рабочее время
        </button>
      )}

      {hoursOpen && location.pathname === "/calendar" && (
        <div className="fixed inset-0 z-[2147483647] flex items-end justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-t-3xl p-5 pb-7 bg-[var(--surface)] border-t border-[var(--line)] shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-medium">Рабочее время</div>
                <div className="text-xs mt-1 text-[var(--ink-soft)]">{calendarDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>
              </div>
              <button onClick={() => setHoursOpen(false)} className="p-2 rounded-full bg-[var(--surface-alt)]"><X size={17} /></button>
            </div>
            <div className="flex gap-3">
              <label className="flex-1"><div className="text-[10px] mb-1 text-[var(--ink-soft)]">Начало</div><input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl p-3 text-sm bg-[var(--surface-alt)] border border-[var(--line)] outline-none font-mono" /></label>
              <label className="flex-1"><div className="text-[10px] mb-1 text-[var(--ink-soft)]">Конец</div><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl p-3 text-sm bg-[var(--surface-alt)] border border-[var(--line)] outline-none font-mono" /></label>
            </div>
            <button onClick={saveHours} disabled={saving || !start || !end || start >= end} className="w-full mt-4 rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "var(--moss)", color: "var(--on-accent)" }}><Check size={16} />{saving ? "Сохраняем…" : "Сохранить"}</button>
          </div>
        </div>
      )}

      <div className="zf-bottom-nav fixed z-[2147483647] bottom-0 left-0 right-0 max-w-sm mx-auto flex items-center justify-between px-6 py-3 border-t border-[var(--line)] shadow-[0_-6px_18px_rgba(0,0,0,0.08)]" style={{ backgroundColor: "var(--nav-bg)", opacity: 1, pointerEvents: "auto" }}>
        {NAV.map(({ to, label, Icon }) => <NavLink key={to} to={to} end className={({ isActive }) => `flex flex-col items-center gap-1 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--moss)] ${isActive ? "text-[var(--moss)]" : "text-[var(--ink-soft)]"}`}>{({ isActive }) => <><Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />{label}</>}</NavLink>)}
      </div>
    </>
  );

  return typeof document === "undefined" ? nav : createPortal(nav, document.body);
}
