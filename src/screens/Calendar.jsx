import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";

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

const BASE_APPTS = [
  { id: 1, day: 0, start: "09:00", dur: 60, name: "Марина Соколова", service: "Классический массаж", color: "#7C9A86" },
  { id: 2, day: 0, start: "10:30", dur: 90, name: "Игорь Плетнёв", service: "Спортивный массаж", color: "#B98572" },
  { id: 3, day: 0, start: "13:00", dur: 60, name: "Анна Ким", service: "Лимфодренаж", color: "#9C8FB0" },
  { id: 4, day: 1, start: "11:00", dur: 45, name: "Дарья Ефимова", service: "Массаж лица", color: "#C6A15B" },
  { id: 5, day: 1, start: "15:30", dur: 60, name: "Олег Крылов", service: "Классический массаж", color: "#7C9A86" },
  { id: 6, day: 2, start: "10:00", dur: 60, name: "Света Волкова", service: "Лимфодренаж", color: "#9C8FB0" },
  { id: 7, day: 4, start: "09:30", dur: 90, name: "Павел Гриб", service: "Спортивный массаж", color: "#B98572" },
];

export default function Calendar() {
  const [view, setView] = useState("day");
  const [dayIndex, setDayIndex] = useState((new Date().getDay() + 6) % 7);
  const [appts, setAppts] = useState(BASE_APPTS);
  const [selectedId, setSelectedId] = useState(null);

  const monday = useMemo(() => startOfWeek(new Date()), []);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; }),
    [monday]
  );
  const today = new Date();
  const isToday = (d) => d.toDateString() === today.toDateString();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const dayAppts = appts.filter((a) => a.day === dayIndex).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const selected = appts.find((a) => a.id === selectedId);

  function moveSelected(deltaMin) {
    setAppts((prev) => prev.map((a) => {
      if (a.id !== selectedId) return a;
      let next = toMinutes(a.start) + deltaMin;
      next = Math.max(DAY_START, Math.min(next, DAY_END - a.dur));
      return { ...a, start: toTime(next) };
    }));
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

        {view === "week" ? (
          <div className="mx-5 mt-5 flex flex-col gap-3">
            {weekDates.map((d, i) => {
              const list = appts.filter((a) => a.day === i).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
              if (list.length === 0) return null;
              return (
                <div key={i} className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
                  <div className="text-sm font-medium mb-2 capitalize" style={{ color: isToday(d) ? "var(--clay)" : "var(--ink-soft)" }}>
                    {d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                  <div className="flex flex-col gap-2">
                    {list.map((a) => (
                      <button key={a.id} onClick={() => { setDayIndex(i); setView("day"); setSelectedId(a.id); }} className="flex items-center gap-2 text-left">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                        <span className="text-xs w-11 shrink-0 font-mono text-[var(--ink-soft)]">{a.start}</span>
                        <span className="text-sm truncate">{a.name}</span>
                        <span className="text-xs ml-auto shrink-0 text-[var(--ink-soft)]">{a.service}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
              const top = ((toMinutes(a.start) - DAY_START) / 60) * HOUR_H;
              const height = Math.max((a.dur / 60) * HOUR_H, 40);
              const isSel = selectedId === a.id;
              return (
                <button
                  key={a.id} onClick={() => setSelectedId(isSel ? null : a.id)}
                  className="absolute left-10 right-0 rounded-xl text-left px-3 py-1.5 overflow-hidden"
                  style={{ top, height, background: `${a.color}26`, borderLeft: `3px solid ${a.color}`, boxShadow: isSel ? `0 0 0 2px ${a.color}` : "none" }}
                >
                  <div className="text-xs font-medium">{a.start} · {a.name}</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">{a.service}</div>
                </button>
              );
            })}
          </div>
        )}

        {selected && view === "day" && (
          <div className="fixed left-0 right-0 max-w-sm mx-auto px-5" style={{ bottom: 148 }}>
            <div className="rounded-2xl p-4 flex items-center justify-between bg-[var(--surface)] border border-[var(--line)] shadow-lg">
              <div>
                <div className="text-sm font-medium">{selected.name}</div>
                <div className="text-xs text-[var(--ink-soft)]">Перенос записи · {selected.start}</div>
              </div>
              <div className="flex items-center gap-2">
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
