import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getAppointmentsRange, updateAppointment, fmtDate } from "../data/appointments";

const DAY_START = 8 * 60;
const DAY_END = 20 * 60;
const HOUR_H = 64;
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function toMinutes(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function toTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
function startOfWeek(d) {
  const day = (d.getDay() + 6) % 7;
  const s = new Date(d); s.setDate(d.getDate() - day); s.setHours(0, 0, 0, 0);
  return s;
}

export default function Calendar() {
  const [view, setView] = useState("day");
  const [dayIndex, setDayIndex] = useState((new Date().getDay() + 6) % 7);
  const [appts, setAppts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [selectedId, setSelectedId] = useState(null);

  const monday = useMemo(() => startOfWeek(new Date()), []);
  const sunday = useMemo(() => { const d = new Date(monday); d.setDate(monday.getDate() + 6); return d; }, [monday]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; }),
    [monday]
  );

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getAppointmentsRange(monday, sunday)
      .then((data) => { if (!cancelled) { setAppts(data); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [monday, sunday]);

  const today = new Date();
  const isToday = (d) => d.toDateString() === today.toDateString();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  function dayOf(appt) {
    return weekDates.findIndex((d) => fmtDate(d) === appt.date);
  }

  const dayAppts = appts
    .filter((a) => dayOf(a) === dayIndex && a.status !== "cancelled")
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  const selected = appts.find((a) => a.id === selectedId);

  async function moveSelected(deltaMin) {
    if (!selected) return;
    let next = toMinutes(selected.start_time) + deltaMin;
    next = Math.max(DAY_START, Math.min(next, DAY_END - selected.duration));
    const newTime = toTime(next);
    setAppts((prev) => prev.map((a) => (a.id === selectedId ? { ...a, start_time: newTime } : a)));
    try {
      await updateAppointment(selectedId, { start_time: newTime });
    } catch {
      // откатываем при ошибке сети
      setAppts((prev) => prev.map((a) => (a.id === selectedId ? { ...a, start_time: selected.start_time } : a)));
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-center justify-between px-5 pt-7 pb-3">
          <div className="text-2xl font-serif" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>Календарь</div>
          <ThemeToggle />
        </div>

        <div className="mx-5 flex rounded-full p-1 bg-[var(--surface-alt)] border border-[var(--line)]">
          {[["day", "День"], ["week", "Неделя"]].map(([key, label]) => (
            <button
              key={key} onClick={() => setView(key)}
              className="flex-1 rounded-full py-2 text-sm font-medium transition-colors"
              style={{ background: view === key ? "var(--moss)" : "transparent", color: view === key ? "var(--on-accent)" : "var(--ink-soft)" }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex justify-between mx-5 mt-4">
          {weekDates.map((d, i) => {
            const active = i === dayIndex;
            return (
              <button
                key={i} onClick={() => { setDayIndex(i); setView("day"); setSelectedId(null); }}
                className="flex flex-col items-center gap-1 rounded-xl py-2 w-9"
                style={{ background: active ? "var(--moss)" : "transparent", color: active ? "var(--on-accent)" : "var(--ink-soft)" }}
              >
                <span className="text-[10px] uppercase opacity-80">{WEEKDAYS[i]}</span>
                <span className="text-sm font-medium" style={{ color: active ? "inherit" : isToday(d) ? "var(--clay)" : "var(--ink)" }}>{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        {status === "loading" && <div className="text-sm text-center py-10 text-[var(--ink-soft)]">Загружаем записи…</div>}
        {status === "error" && <div className="text-sm text-center py-10 text-[var(--clay)]">Не удалось загрузить записи</div>}

        {status === "ready" && view === "week" && (
          <div className="mx-5 mt-5 flex flex-col gap-3">
            {weekDates.map((d, i) => {
              const list = appts.filter((a) => dayOf(a) === i && a.status !== "cancelled").sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
              if (list.length === 0) return null;
              return (
                <div key={i} className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
                  <div className="text-sm font-medium mb-2 capitalize" style={{ color: isToday(d) ? "var(--clay)" : "var(--ink-soft)" }}>
                    {d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                  <div className="flex flex-col gap-2">
                    {list.map((a) => (
                      <button key={a.id} onClick={() => { setDayIndex(i); setView("day"); setSelectedId(a.id); }} className="flex items-center gap-2 text-left">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.services?.color || "var(--line)" }} />
                        <span className="text-xs w-11 shrink-0 font-mono text-[var(--ink-soft)]">{a.start_time}</span>
                        <span className="text-sm truncate">{a.clients?.name || "Клиент удалён"}</span>
                        <span className="text-xs ml-auto shrink-0 text-[var(--ink-soft)]">{a.services?.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {appts.filter((a) => a.status !== "cancelled").length === 0 && (
              <div className="text-sm text-center py-6 text-[var(--ink-soft)]">На этой неделе записей нет</div>
            )}
          </div>
        )}

        {status === "ready" && view === "day" && (
          <div className="mx-5 mt-5 relative" style={{ height: ((DAY_END - DAY_START) / 60) * HOUR_H }}>
            {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => (
              <div key={i} className="absolute left-10 right-0 flex items-start border-t border-[var(--line)]" style={{ top: i * HOUR_H }}>
                <span className="text-[11px] -translate-x-full -ml-2 -mt-1.5 font-mono text-[var(--ink-soft)]">
                  {toTime(DAY_START + i * 60)}
                </span>
              </div>
            ))}

            {isToday(weekDates[dayIndex]) && nowMinutes >= DAY_START && nowMinutes <= DAY_END && (
              <div className="absolute left-10 right-0 flex items-center" style={{ top: ((nowMinutes - DAY_START) / 60) * HOUR_H }}>
                <span className="zf-now-dot w-2 h-2 rounded-full -ml-1" style={{ background: "var(--now)" }} />
                <div className="flex-1 h-px" style={{ background: "var(--now)" }} />
              </div>
            )}

            {dayAppts.map((a) => {
              const top = ((toMinutes(a.start_time) - DAY_START) / 60) * HOUR_H;
              const height = Math.max((a.duration / 60) * HOUR_H, 40);
              const isSel = selectedId === a.id;
              const color = a.services?.color || "#999";
              return (
                <button
                  key={a.id} onClick={() => setSelectedId(isSel ? null : a.id)}
                  className="absolute left-10 right-0 rounded-xl text-left px-3 py-1.5 overflow-hidden"
                  style={{ top, height, background: `${color}26`, borderLeft: `3px solid ${color}`, boxShadow: isSel ? `0 0 0 2px ${color}` : "none" }}
                >
                  <div className="text-xs font-medium">{a.start_time} · {a.clients?.name || "Клиент удалён"}</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">{a.services?.name}</div>
                </button>
              );
            })}

            {dayAppts.length === 0 && (
              <div className="text-sm text-center py-6 text-[var(--ink-soft)]">На этот день записей нет</div>
            )}
          </div>
        )}

        {selected && view === "day" && (
          <div className="fixed left-0 right-0 max-w-sm mx-auto px-5" style={{ bottom: 148 }}>
            <div className="rounded-2xl p-4 flex items-center justify-between bg-[var(--surface)] border border-[var(--line)] shadow-lg">
              <div>
                <div className="text-sm font-medium">{selected.clients?.name || "Клиент удалён"}</div>
                <div className="text-xs text-[var(--ink-soft)]">Перенос записи · {selected.start_time}</div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/appointment/${selected.id}`} aria-label="Открыть полную форму записи" className="rounded-full p-2 bg-[var(--surface-alt)]">
                  <Pencil size={16} />
                </Link>
                <button onClick={() => moveSelected(-30)} aria-label="На 30 минут раньше" className="rounded-full p-2 bg-[var(--surface-alt)]">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => moveSelected(30)} aria-label="На 30 минут позже" className="rounded-full p-2 bg-[var(--surface-alt)]">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        <BottomNav />

        <Link
          to="/appointment/new" aria-label="Новая запись"
          className="fixed rounded-full flex items-center justify-center shadow-lg"
          style={{ background: "var(--clay)", color: "#FBF9F3", width: 44, height: 44, bottom: 88, right: "calc(50% - 176px)" }}
        >
          <Plus size={20} />
        </Link>
      </div>
    </div>
  );
}
