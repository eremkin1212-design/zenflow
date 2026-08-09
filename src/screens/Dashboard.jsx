import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Phone, MessageCircle, Clock, ChevronRight, CalendarPlus, UserPlus, Check, X } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getAppointmentsRange, completeAppointment, fmtDate } from "../data/appointments";
import { useAuth } from "../auth";
import { getProfile } from "../data/profile";

const TOTAL_SLOTS = 8;

function greeting(h) {
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [profileName, setProfileName] = useState("");
  const [completingId, setCompletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    getAppointmentsRange(today, today)
      .then((data) => { if (!cancelled) { setAppts(data); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  async function handleComplete(a, method) {
    try {
      const updated = await completeAppointment(a, method);
      setAppts((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
      setCompletingId(null);
    } catch {
      window.alert("Не удалось завершить. Попробуй снова.");
    }
  }

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => setProfileName(p?.name || "")).catch(() => {});
  }, [user]);

  const hour = new Date().getHours();
  const dateStr = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const income = useMemo(() => appts.filter((a) => a.status === "done").reduce((s, a) => s + a.price, 0), [appts]);
  const booked = appts.filter((a) => a.status !== "cancelled").length;
  const freeSlots = Math.max(TOTAL_SLOTS - booked, 0);
  const sorted = useMemo(
    () => [...appts].filter((a) => a.status !== "cancelled").sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appts]
  );
  const next = sorted.find((a) => a.status === "planned");

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-start justify-between px-5 pt-7 pb-4">
          <div>
            <div className="text-2xl font-serif" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>
              {greeting(hour)}{profileName ? `, ${profileName.split(" ")[0]}` : ""}
            </div>
            <div className="text-sm mt-1 capitalize text-[var(--ink-soft)]">{dateStr}</div>
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-5 rounded-3xl px-5 py-6 flex items-center gap-5 bg-[var(--surface)] border border-[var(--line)]">
          <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0">
            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
              const filled = i < booked;
              const isNextRing = i === booked - 1;
              const r = 10 + i * 5.2;
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
          <Link to={`/clients/${next.clients?.id}`} className="block mx-5 mt-4 rounded-3xl p-5 bg-[var(--moss)]" style={{ color: "var(--on-accent)" }}>
            <div className="text-xs uppercase opacity-80" style={{ letterSpacing: "0.08em" }}>Следующий клиент</div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <div className="text-lg font-serif" style={{ fontWeight: 500 }}>{next.clients?.name || "Клиент удалён"}</div>
                <div className="text-sm opacity-85 mt-0.5">{next.services?.name}</div>
                <div className="flex items-center gap-1.5 text-sm mt-2 opacity-90">
                  <Clock size={14} /> {next.start_time}
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
          <Link to="/clients/new" className="rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium bg-[var(--surface)] border border-[var(--line)]">
            <UserPlus size={16} className="text-[var(--clay)]" /> Новый клиент
          </Link>
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-3 text-[var(--ink-soft)]">Сегодня</div>

          {status === "loading" && <div className="text-sm text-center py-6 text-[var(--ink-soft)]">Загружаем записи…</div>}
          {status === "error" && <div className="text-sm text-center py-6 text-[var(--clay)]">Не удалось загрузить записи</div>}
          {status === "ready" && sorted.length === 0 && <div className="text-sm text-center py-6 text-[var(--ink-soft)]">На сегодня записей нет</div>}

          {status === "ready" && sorted.length > 0 && (
            <div className="relative pl-4">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[var(--line)]" />
              <div className="flex flex-col gap-2">
                {sorted.map((a) => (
                  <div key={a.id}>
                    <div
                      className="relative flex items-center gap-2 rounded-2xl p-3 -ml-1"
                      style={{ background: a.status === "planned" && a.id === next?.id ? "var(--moss-soft)" : "transparent" }}
                    >
                      <span className="absolute -left-[9px] w-3 h-3 rounded-full" style={{ background: a.services?.color || "var(--line)", boxShadow: "0 0 0 3px var(--paper)" }} />
                      <Link to={`/clients/${a.clients?.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 text-sm shrink-0 font-mono text-[var(--ink-soft)]">{a.start_time}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{a.clients?.name || "Клиент удалён"}</div>
                          <div className="text-xs mt-0.5 text-[var(--ink-soft)] truncate">{a.services?.name}</div>
                        </div>
                        <div
                          className="text-sm font-mono shrink-0"
                          style={{ color: a.status === "done" ? "var(--ink-soft)" : "var(--ink)", textDecoration: a.status === "done" ? "line-through" : "none" }}
                        >
                          {a.price.toLocaleString("ru-RU")}₽
                        </div>
                        <ChevronRight size={16} className="text-[var(--ink-soft)] shrink-0" />
                      </Link>
                      {a.status === "planned" && (
                        <button
                          onClick={() => setCompletingId((prev) => (prev === a.id ? null : a.id))}
                          aria-label="Завершить и принять оплату"
                          className="rounded-full p-2 shrink-0"
                          style={{ background: "var(--moss)", color: "var(--on-accent)" }}
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>

                    {completingId === a.id && (
                      <div className="mt-1 ml-3 rounded-2xl p-3 bg-[var(--surface-alt)]">
                        <div className="text-xs mb-2 text-[var(--ink-soft)]">Как оплатили?</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleComplete(a, "Наличные")} className="flex-1 rounded-full py-2 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
                            Наличные
                          </button>
                          <button onClick={() => handleComplete(a, "Карта")} className="flex-1 rounded-full py-2 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
                            Карта
                          </button>
                          <button onClick={() => setCompletingId(null)} aria-label="Отмена" className="rounded-full p-2 bg-[var(--surface)]">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
