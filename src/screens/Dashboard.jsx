import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Phone, MessageCircle, Clock, CalendarPlus, UserPlus, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getAppointmentsRange, completeAppointment, fmtDate } from "../data/appointments";
import { useAuth } from "../auth";
import { getProfile } from "../data/profile";

const KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DEFAULT_WEEK = [
  { key: "mon", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "tue", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "wed", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "thu", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "fri", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "sat", on: true, start: "10:00", end: "16:00", breakStart: null, breakEnd: null },
  { key: "sun", on: false, start: "10:00", end: "16:00", breakStart: null, breakEnd: null },
];
function mins(t) { const [h, m] = String(t || "00:00").split(":").map(Number); return h * 60 + m; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function mondayIndex(d) { return (d.getDay() + 6) % 7; }
function normalize(value) { if (Array.isArray(value)) return { weekly: value.length ? value : DEFAULT_WEEK, dates: {} }; return { weekly: value?.weekly?.length ? value.weekly : DEFAULT_WEEK, dates: value?.dates || {} }; }
function hoursForDate(value, date) { const s = normalize(value); const key = fmtDate(date); const base = s.weekly.find((d) => d.key === KEYS[mondayIndex(date)]) || DEFAULT_WEEK[mondayIndex(date)]; return s.dates[key] ? { ...base, ...s.dates[key] } : base; }
function greeting(h) { if (h < 6) return "Доброй ночи"; if (h < 12) return "Доброе утро"; if (h < 18) return "Добрый день"; return "Добрый вечер"; }

export default function Dashboard() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [appts, setAppts] = useState([]);
  const [workingHours, setWorkingHours] = useState(null);
  const [status, setStatus] = useState("loading");
  const [profileName, setProfileName] = useState("");
  const [completeId, setCompleteId] = useState(null);
  useEffect(() => { if (!user) return; getProfile(user.id).then((p) => { setProfileName(p?.name || ""); setWorkingHours(p?.working_hours || null); }).catch(() => {}); }, [user]);
  useEffect(() => { let dead = false; setStatus("loading"); getAppointmentsRange(date, date).then((d) => { if (!dead) { setAppts(d); setStatus("ready"); } }).catch(() => { if (!dead) setStatus("error"); }); return () => { dead = true; }; }, [date]);
  const wh = hoursForDate(workingHours, date);
  const workMinutes = Math.max(60, mins(wh.end) - mins(wh.start) - (wh.breakStart && wh.breakEnd ? Math.max(0, mins(wh.breakEnd) - mins(wh.breakStart)) : 0));
  const active = useMemo(() => appts.filter((a) => a.status !== "cancelled"), [appts]);
  const occupied = active.reduce((s, a) => s + Number(a.duration || 0), 0);
  const load = wh.on ? Math.min(100, Math.round((occupied / workMinutes) * 100)) : 0;
  const income = active.filter((a) => a.status === "done").reduce((s, a) => s + Number(a.price || 0), 0);
  const sorted = [...active].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const next = sorted.find((a) => a.status === "planned");
  async function complete(a, method) { try { const u = await completeAppointment(a, method); setAppts((p) => p.map((x) => x.id === a.id ? u : x)); setCompleteId(null); } catch { window.alert("Не удалось завершить"); } }
  return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors"><div className="max-w-sm mx-auto relative pb-24">
    <div className="flex items-start justify-between px-5 pt-7 pb-4"><div><div className="text-2xl font-serif" style={{ fontWeight: 500 }}>{greeting(new Date().getHours())}{profileName ? `, ${profileName.split(" ")[0]}` : ""}</div><div className="text-sm mt-1 capitalize text-[var(--ink-soft)]">{date.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div></div><ThemeToggle /></div>
    <div className="mx-5 rounded-3xl px-5 py-5 bg-[var(--surface)] border border-[var(--line)]"><div className="flex items-center gap-5"><div className="relative w-[92px] h-[92px] shrink-0"><svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90"><circle cx="46" cy="46" r="36" fill="none" stroke="var(--line)" strokeWidth="7" /><circle cx="46" cy="46" r="36" fill="none" stroke="var(--moss)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - load / 100)}`} /></svg><div className="absolute inset-0 flex items-center justify-center text-lg font-mono font-medium">{load}%</div></div><div className="flex-1"><div className="flex items-center justify-between"><div className="text-xs uppercase text-[var(--ink-soft)]" style={{ letterSpacing: ".08em" }}>Итоги дня</div><div className="flex gap-1"><button onClick={() => setDate((d) => addDays(d, -1))} className="p-1.5 rounded-full bg-[var(--surface-alt)]"><ChevronLeft size={15} /></button><button onClick={() => setDate((d) => addDays(d, 1))} className="p-1.5 rounded-full bg-[var(--surface-alt)]"><ChevronRight size={15} /></button></div></div><div className="mt-1 text-2xl font-mono" style={{ fontWeight: 500 }}>{income.toLocaleString("ru-RU")} ₽</div><div className="text-sm mt-1 text-[var(--ink-soft)]">{occupied >= 60 ? `${Math.floor(occupied / 60)} ч ${occupied % 60 ? `${occupied % 60} мин` : ""}` : `${occupied} мин`} занято · {active.length} записей</div><div className="text-xs mt-1 text-[var(--ink-soft)]">{wh.on ? `График ${wh.start}–${wh.end}` : "Выходной"}</div></div></div></div>
    {next && <Link to={`/clients/${next.clients?.id}`} className="block mx-5 mt-4 rounded-3xl p-5 bg-[var(--moss)]" style={{ color: "var(--on-accent)" }}><div className="text-xs uppercase opacity-80">Следующий клиент</div><div className="flex items-center justify-between mt-2"><div><div className="text-lg font-serif">{next.clients?.name || "Клиент"}</div><div className="text-sm opacity-85">{next.services?.name}</div><div className="flex items-center gap-1.5 text-sm mt-2"><Clock size={14} />{next.start_time}</div></div><div className="flex flex-col gap-2"><span className="rounded-full p-2.5" style={{ background: "rgba(255,255,255,.18)" }}><Phone size={16} /></span><span className="rounded-full p-2.5" style={{ background: "rgba(255,255,255,.18)" }}><MessageCircle size={16} /></span></div></div></Link>}
    <div className="grid grid-cols-2 gap-3 mx-5 mt-4"><Link to="/appointment/new" className="rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium bg-[var(--surface)] border border-[var(--line)]"><CalendarPlus size={16} className="text-[var(--moss)]" />Новая запись</Link><Link to="/clients/new" className="rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium bg-[var(--surface)] border border-[var(--line)]"><UserPlus size={16} className="text-[var(--clay)]" />Новый клиент</Link></div>
    <div className="mx-5 mt-6"><div className="flex justify-between items-center mb-3"><div className="text-sm font-medium text-[var(--ink-soft)]">{date.toDateString() === new Date().toDateString() ? "Сегодня" : date.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>{date.toDateString() !== new Date().toDateString() && <button onClick={() => setDate(new Date())} className="text-xs text-[var(--moss)]">Сегодня</button>}</div>{status === "loading" && <div className="py-6 text-center text-sm text-[var(--ink-soft)]">Загружаем…</div>}{status === "error" && <div className="py-6 text-center text-sm text-[var(--clay)]">Не удалось загрузить</div>}{status === "ready" && !sorted.length && <div className="py-6 text-center text-sm text-[var(--ink-soft)]">Записей нет</div>}{sorted.map((a) => <div key={a.id} className="relative flex items-center gap-2 rounded-2xl p-3 mb-2 bg-[var(--surface)] border border-[var(--line)]"><span className="w-2 h-2 rounded-full" style={{ background: a.services?.color || "var(--moss)" }} /><Link to={`/appointment/${a.id}`} className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-mono text-sm text-[var(--ink-soft)]">{a.start_time}</span><span className="text-sm font-medium truncate">{a.clients?.name || "Клиент"}</span></div><div className="text-xs mt-1 text-[var(--ink-soft)] truncate">{a.services?.name} · {a.price.toLocaleString("ru-RU")} ₽ {a.status === "done" ? "· Оплачено" : ""}</div></Link>{a.status === "planned" && <button onClick={() => setCompleteId((x) => x === a.id ? null : a.id)} className="rounded-full p-2 bg-[var(--moss)] text-[var(--on-accent)]"><Check size={14} /></button>}{completeId === a.id && <div className="absolute right-2 top-12 z-10 rounded-2xl p-2 bg-[var(--surface)] border border-[var(--line)] flex gap-1"><button onClick={() => complete(a, "Наличные")} className="rounded-full px-3 py-2 text-xs bg-[var(--moss)] text-[var(--on-accent)]">Наличные</button><button onClick={() => complete(a, "Карта")} className="rounded-full px-3 py-2 text-xs bg-[var(--moss)] text-[var(--on-accent)]">Карта</button><button onClick={() => setCompleteId(null)} className="p-2"><X size={14} /></button></div>}</div>)}</div>
    <BottomNav /><Link to="/appointment/new" className="fixed rounded-full flex items-center justify-center shadow-lg" style={{ background: "var(--clay)", color: "#FBF9F3", width: 52, height: 52, bottom: 84, right: "calc(50% - 176px)" }}><Plus size={22} /></Link>
  </div></div>;
}
