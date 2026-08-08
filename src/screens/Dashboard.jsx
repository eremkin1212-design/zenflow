import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Phone, MessageCircle, Clock, ChevronRight, CalendarPlus, UserPlus } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";

const APPTS = [
  { id: 1, clientId: 1, time: "09:00", name: "Марина Соколова", service: "Классический массаж", color: "#7C9A86", status: "done", price: 4200 },
  { id: 2, clientId: 2, time: "10:30", name: "Игорь Плетнёв", service: "Спортивный массаж", color: "#B98572", status: "done", price: 5200 },
  { id: 3, clientId: 3, time: "12:00", name: "Анна Ким", service: "Лимфодренаж", color: "#9C8FB0", status: "next", price: 3900 },
  { id: 4, clientId: 4, time: "14:00", name: "Дарья Ефимова", service: "Массаж лица", color: "#C6A15B", status: "upcoming", price: 2800 },
  { id: 5, clientId: 5, time: "16:30", name: "Олег Крылов", service: "Классический массаж", color: "#7C9A86", status: "upcoming", price: 4200 },
];
const TOTAL_SLOTS = 8;

function greeting(h) {
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export default function Dashboard() {
  const hour = new Date().getHours();
  const dateStr = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const income = useMemo(() => APPTS.filter((a) => a.status === "done").reduce((s, a) => s + a.price, 0), []);
  const booked = APPTS.length;
  const freeSlots = TOTAL_SLOTS - booked;
  const next = APPTS.find((a) => a.status === "next") || APPTS.find((a) => a.status === "upcoming");

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-start justify-between px-5 pt-7 pb-4">
          <div>
            <div className="text-2xl font-serif" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>
              {greeting(hour)}, Лиза
            </div>
            <div className="text-sm mt-1 capitalize text-[var(--ink-soft)]">{dateStr}</div>
          </div>
          <ThemeToggle />
        </div>

        {/* signature: breath of the day */}
        <div className="mx-5 rounded-3xl px-5 py-6 flex items-center gap-5 bg-[var(--surface)] border border-[var(--line)]">
          <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0">
            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
              const r = 10 + i * 5.2;
              const filled = i < booked;
              const isNextRing = i === booked - 1;
              return (
                <circle
                  key={i} cx={46} cy={46} r={r} fill="none"
                  stroke={filled ? "var(--moss)" : "var(--line)"}
                  strokeWidth={filled ? 2.4 : 1}
                  opacity={filled ? 0.35 + i * 0.07 : 0.6}
                  className={isNextRing ? "zf-pulse" : ""}
                />
              );
            })}
          </svg>
          <div className="flex-1">
            <div className="text-xs uppercase text-[var(--ink-soft)]" style={{ letterSpacing: "0.08em" }}>Дыхание дня</div>
            <div className="mt-1 text-2xl font-mono" style={{ fontWeight: 500 }}>{income.toLocaleString("ru-RU")} ₽</div>
            <div className="text-sm mt-1 text-[var(--ink-soft)]">{booked} записей · {freeSlots} свободных окон</div>
          </div>
        </div>

        {next && (
          <Link to={`/clients/${next.clientId}`} className="block mx-5 mt-4 rounded-3xl p-5 bg-[var(--moss)]" style={{ color: "var(--on-accent)" }}>
            <div className="text-xs uppercase opacity-80" style={{ letterSpacing: "0.08em" }}>Следующий клиент</div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <div className="text-lg font-serif" style={{ fontWeight: 500 }}>{next.name}</div>
                <div className="text-sm opacity-85 mt-0.5">{next.service}</div>
                <div className="flex items-center gap-1.5 text-sm mt-2 opacity-90">
                  <Clock size={14} /> {next.time}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="rounded-full p-2.5" style={{ background: "rgba(255,255,255,0.18)" }}><Phone size={16} /></span>
                <span className="rounded-full p-2.5" style={{ background: "rgba(255,255,255,0.18)" }}><MessageCircle size={16} /></span>
              </div>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3 mx-5 mt-4">
          <Link to="/appointment/new" className="rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium bg-[var(--surface)] border border-[var(--line)]">
            <CalendarPlus size={16} className="text-[var(--moss)]" /> Новая запись
          </Link>
          <Link to="/clients" className="rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium bg-[var(--surface)] border border-[var(--line)]">
            <UserPlus size={16} className="text-[var(--clay)]" /> Новый клиент
          </Link>
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-3 text-[var(--ink-soft)]">Сегодня</div>
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[var(--line)]" />
            <div className="flex flex-col gap-4">
              {APPTS.map((a) => (
                <Link
                  key={a.id} to={`/clients/${a.clientId}`}
                  className="relative flex items-center gap-3 text-left rounded-2xl p-3 -ml-1"
                  style={{ background: a.status === "next" ? "var(--moss-soft)" : "transparent" }}
                >
                  <span className="absolute -left-[9px] w-3 h-3 rounded-full" style={{ background: a.color, boxShadow: "0 0 0 3px var(--paper)" }} />
                  <div className="w-12 text-sm shrink-0 font-mono text-[var(--ink-soft)]">{a.time}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{a.service}</div>
                  </div>
                  <div
                    className="text-sm font-mono"
                    style={{ color: a.status === "done" ? "var(--ink-soft)" : "var(--ink)", textDecoration: a.status === "done" ? "line-through" : "none" }}
                  >
                    {a.price.toLocaleString("ru-RU")}₽
                  </div>
                  <ChevronRight size={16} className="text-[var(--ink-soft)]" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <BottomNav />

        <Link
          to="/appointment/new" aria-label="Новая запись"
          className="fixed rounded-full flex items-center justify-center shadow-lg"
          style={{ background: "var(--clay)", color: "#FBF9F3", width: 52, height: 52, bottom: 84, right: "calc(50% - 176px)" }}
        >
          <Plus size={22} />
        </Link>
      </div>
    </div>
  );
}
