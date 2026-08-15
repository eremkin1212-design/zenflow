import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const CALENDAR_DATE_KEY = "zenflow-calendar-selected-date";

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function CalendarTodayButton() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (location.pathname !== "/calendar") {
      setVisible(false);
      return;
    }
    const sync = () => {
      const saved = localStorage.getItem(CALENDAR_DATE_KEY);
      setVisible(Boolean(saved && saved !== todayKey()));
    };
    sync();
    const timer = window.setInterval(sync, 300);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
    };
  }, [location.pathname]);

  if (location.pathname !== "/calendar" || !visible) return null;

  function goToday() {
    localStorage.setItem(CALENDAR_DATE_KEY, todayKey());
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={goToday}
      className="fixed z-20 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm border border-[var(--line)] bg-[var(--surface)] text-[var(--moss)]"
      style={{ top: 142, left: "calc(50% + 92px)" }}
      aria-label="Вернуться к сегодняшнему дню"
    >
      Сегодня
    </button>
  );
}
