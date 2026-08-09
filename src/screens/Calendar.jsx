import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, X, Check, GripVertical } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getAppointmentsRange, getAppointmentServices, updateAppointment, completeAppointment, fmtDate } from "../data/appointments";
import { getProfile } from "../data/profile";
import { useAuth } from "../auth";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DEFAULT_WEEK = [
  { key: "mon", on: false, start: "10:00", end: "22:00", breakStart: null, breakEnd: null },
  { key: "tue", on: false, start: "10:00", end: "22:00", breakStart: null, breakEnd: null },
  { key: "wed", on: false, start: "10:00", end: "22:00", breakStart: null, breakEnd: null },
  { key: "thu", on: false, start: "10:00", end: "22:00", breakStart: null, breakEnd: null },
  { key: "fri", on: false, start: "10:00", end: "22:00", breakStart: null, breakEnd: null },
  { key: "sat", on: false, start: "10:00", end: "22:00", breakStart: null, breakEnd: null },
  { key: "sun", on: false, start: "10:00", end: "16:00", breakStart: null, breakEnd: null },
];
const HOUR_H = 52;
const CALENDAR_DATE_KEY = "zenflow-calendar-selected-date";
function minutes(t) { const [h, m] = String(t || "00:00").split(":").map(Number); return h * 60 + m; }
function time(m) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }
function startOfWeek(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function mondayIndex(d) { return (d.getDay() + 6) % 7; }
function normalizeSchedule(value) { if (Array.isArray(value)) return { weekly: value.length ? value : DEFAULT_WEEK, dates: {} }; return { weekly: value?.weekly?.length ? value.weekly : DEFAULT_WEEK, dates: value?.dates || {} }; }
function hoursForDate(scheduleValue, date) {
  const schedule = normalizeSchedule(scheduleValue);
  const key = fmtDate(date);
  const base = schedule.weekly.find((d) => d.key === KEYS[mondayIndex(date)]) || DEFAULT_WEEK[mondayIndex(date)];
  return schedule.dates[key] ? { ...base, ...schedule.dates[key] } : base;
}
function readSavedDate() {
  try {
    const saved = localStorage.getItem(CALENDAR_DATE_KEY);
    if (!saved) return new Date();
    const d = new Date(`${saved}T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  } catch { return new Date(); }
}

export default function Calendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(readSavedDate);
  const [view, setView] = useState("day");
  const [appts, setAppts] = useState([]);
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => { const d = readSavedDate(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [drag, setDrag] = useState(null);
  const swipe = useRef(null);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dayHours = hoursForDate(hours, selectedDate);
  const dayStart = minutes(dayHours.start);
  const dayEnd = Math.max(dayStart + 60, minutes(dayHours.end));
  const dayAppts = appts.filter((a) => a.date === fmtDate(selectedDate) && a.status !== "cancelled").sort((a, b) => minutes(a.start_time) - minutes(b.start_time));
  const earliest = dayAppts.length ? Math.min(dayStart, ...dayAppts.map((a) => minutes(a.start_time))) : dayStart;
  const latest = dayAppts.length ? Math.max(dayEnd, ...dayAppts.map((a) => minutes(a.start_time) + Number(a.duration || 0))) : dayEnd;
  const gridStart = Math.floor(earliest / 15) * 15;
  const gridEnd = Math.ceil(latest / 15) * 15;
  const gridHeight = Math.max(HOUR_H, ((gridEnd - gridStart) / 60) * HOUR_H);
  const selected = appts.find((a) => a.id === selectedId);
  const selectedEnd = selected ? time(minutes(selected.start_time) + Number(selected.duration || 0)) : "";

  useEffect(() => {
    if (!user) return;
    let dead = false;
    getProfile(user.id).then((p) => { if (!dead) setHours(p?.working_hours || null); }).catch(() => {});
    return () => { dead = true; };
  }, [user]);
  useEffect(() => {
    let dead = false;
    setLoading(true);
    getAppointmentsRange(weekStart, addDays(weekStart, 6)).then((d) => { if (!dead) { setAppts(d); setLoading(false); } }).catch(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [weekStart]);
  useEffect(() => {
    if (!selected?.id) { setSelectedServices([]); return; }
    let dead = false;
    setSelectedServices([]);
    getAppointmentServices(selected.id).then((rows) => {
      if (dead) return;
      setSelectedServices((rows || []).map((x) => ({
        name: x.services?.name || "Услуга",
        color: x.services?.color || "var(--moss)",
        duration: Number(x.duration || x.services?.duration || 0),
        price: Number(x.price || x.services?.price || 0),
      })));
    }).catch(() => { if (!dead) setSelectedServices([]); });
    return () => { dead = true; };
  }, [selected?.id]);

  function goDate(d) {
    const next = new Date(d);
    setSelectedDate(next);
    setPickerMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setSelectedId(null);
    try { localStorage.setItem(CALENDAR_DATE_KEY, fmtDate(next)); } catch {}
  }
  function shiftDay(n) { goDate(addDays(selectedDate, n)); }
  function shiftWeek(n) { goDate(addDays(selectedDate, n * 7)); }
  function swipeStart(e) { swipe.current = { x: e.clientX, y: e.clientY }; }
  function swipeEnd(e) { if (!swipe.current) return; const dx = e.clientX - swipe.current.x; const dy = e.clientY - swipe.current.y; swipe.current = null; if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return; view === "day" ? shiftDay(dx < 0 ? 1 : -1) : shiftWeek(dx < 0 ? 1 : -1); }
  function openAtTime(e) {
    if (e.target.closest("[data-appointment]")) return;
    if (!dayHours.on) return;
    const r = e.currentTarget.getBoundingClientRect();
    const raw = gridStart + ((e.clientY - r.top) / HOUR_H) * 60;
    const snapped = Math.max(dayStart, Math.min(dayEnd - 15, Math.round(raw / 15) * 15));
    navigate(`/appointment/new?date=${fmtDate(selectedDate)}&time=${time(snapped)}`);
  }
  function dragStart(e, a) {
    e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId);
    const top = ((minutes(a.start_time) - gridStart) / 60) * HOUR_H;
    setDrag({ id: a.id, startY: e.clientY, startTop: top, currentTop: top, duration: a.duration, moved: false, original: a.start_time });
  }
  function dragMove(e) {
    if (!drag) return; e.preventDefault();
    const delta = e.clientY - drag.startY; const h = Math.max((drag.duration / 60) * HOUR_H, 40);
    const top = Math.max(0, Math.min(drag.startTop + delta, gridHeight - h));
    setDrag((d) => ({ ...d, currentTop: top, moved: d.moved || Math.abs(delta) > 5 }));
  }
  async function dragEnd() {
    if (!drag) return; const d = drag; setDrag(null);
    if (!d.moved) { setSelectedId((x) => x === d.id ? null : d.id); return; }
    const next = time(Math.max(gridStart, Math.min(gridEnd - d.duration, Math.round((gridStart + (d.currentTop / HOUR_H) * 60) / 15) * 15)));
    const old = appts.find((a) => a.id === d.id)?.start_time; if (next === old) return;
    setAppts((p) => p.map((a) => a.id === d.id ? { ...a, start_time: next } : a));
    try { await updateAppointment(d.id, { start_time: next }); } catch { setAppts((p) => p.map((a) => a.id === d.id ? { ...a, start_time: old } : a)); }
  }
  async function complete(method) {
    if (!selected) return;
    try { const updated = await completeAppointment(selected, method); setAppts((p) => p.map((a) => a.id === selected.id ? updated : a)); setSelectedId(null); setCompleteOpen(false); }
    catch { window.alert("Не удалось завершить запись"); }
  }
  async function cancel() {
    if (!selected || !window.confirm("Отменить запись?")) return;
    try { await updateAppointment(selected.id, { status: "cancelled" }); setAppts((p) => p.map((a) => a.id === selected.id ? { ...a, status: "cancelled" } : a)); setSelectedId(null); }
    catch { window.alert("Не удалось отменить запись"); }
  }
  const monthCells = useMemo(() => {
    const first = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1);
    const offset = mondayIndex(first); const days = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate(); const arr = [];
    for (let i = 0; i < offset; i++) arr.push(null); for (let d = 1; d <= days; d++) arr.push(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), d)); while (arr.length % 7) arr.push(null); return arr;
  }, [pickerMonth]);
  const servicesForSelected = selectedServices.length ? selectedServices : (selected?.services ? [{ name: selected.services.name, color: selected.services.color || "var(--moss)", duration: Number(selected.duration || 0), price: Number(selected.price || 0) }] : []);

  return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans"><div className="max-w-sm mx-auto relative pb-24">
    <div className="flex items-center justify-between px-5 pt-7 pb-3"><div className="text-2xl font-serif" style={{ fontWeight: 500 }}>Календарь</div><ThemeToggle /></div>
    <div className="mx-5 flex rounded-full p-1 bg-[var(--surface-alt)] border border-[var(--line)]">{[["day", "День"], ["week", "Неделя"]].map(([k, l]) => <button key={k} onClick={() => setView(k)} className="flex-1 rounded-full py-2 text-sm font-medium" style={{ background: view === k ? "var(--moss)" : "transparent", color: view === k ? "var(--on-accent)" : "var(--ink-soft)" }}>{l}</button>)}</div>
    <div className="mx-5 mt-4 flex items-center justify-between"><button onClick={() => view === "day" ? shiftDay(-1) : shiftWeek(-1)} className="rounded-full p-2 bg-[var(--surface-alt)] border border-[var(--line)]"><ChevronLeft size={17} /></button><button onClick={() => setPickerOpen(true)} className="text-sm font-medium capitalize px-3 py-2 rounded-xl">{view === "day" ? selectedDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }) : `${weekDates[0].toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${weekDates[6].toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`}</button><button onClick={() => view === "day" ? shiftDay(1) : shiftWeek(1)} className="rounded-full p-2 bg-[var(--surface-alt)] border border-[var(--line)]"><ChevronRight size={17} /></button></div>
    <div className="flex justify-between mx-5 mt-1">{weekDates.map((d, i) => <button key={d.toISOString()} onClick={() => goDate(d)} className="flex flex-col items-center gap-1 rounded-xl py-2 w-9" style={{ background: d.toDateString() === selectedDate.toDateString() ? "var(--moss)" : "transparent", color: d.toDateString() === selectedDate.toDateString() ? "var(--on-accent)" : "var(--ink-soft)" }}><span className="text-[10px] uppercase">{WEEKDAYS[i]}</span><span className="text-sm font-medium">{d.getDate()}</span></button>)}</div>
    <div className="mx-5 text-center text-[11px] mt-1 text-[var(--ink-soft)]">Свайп влево/вправо — {view === "day" ? "день" : "неделя"}</div>
    {!loading && view === "day" && <div className="mx-5 mt-2 text-center text-xs" style={{ color: dayHours.on ? "var(--ink-soft)" : "var(--clay)" }}>{dayHours.on ? `Работа: ${dayHours.start}–${dayHours.end}${dayHours.breakStart ? ` · перерыв ${dayHours.breakStart}–${dayHours.breakEnd}` : ""}` : "Выходной"}</div>}
    {loading ? <div className="py-10 text-center text-sm text-[var(--ink-soft)]">Загружаем записи…</div> : view === "week" ? <div className="mx-5 mt-5 flex flex-col gap-3">{weekDates.map((d) => { const list = appts.filter((a) => a.date === fmtDate(d) && a.status !== "cancelled"); if (!list.length) return null; const wh = hoursForDate(hours, d); return <div key={d.toISOString()} className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]"><div className="flex items-center justify-between text-sm font-medium mb-2 capitalize"><span>{d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "short" })}</span><span className="text-[10px] text-[var(--ink-soft)]">{wh.on ? `${wh.start}–${wh.end}` : "выходной"}</span></div>{list.map((a) => <button key={a.id} onClick={() => { goDate(d); setSelectedId(a.id); }} className="w-full flex items-center gap-2 text-left py-1"><span className="w-2 h-2 rounded-full" style={{ background: a.services?.color || "var(--moss)" }} /><span className="text-xs font-mono w-11">{a.start_time}</span><span className="text-sm truncate">{a.clients?.name || "Клиент"}</span><span className="text-xs ml-auto text-[var(--ink-soft)] truncate">{a.services?.name}</span></button>)}</div>; })}</div> : <div className="mx-5 mt-5 relative" style={{ height: gridHeight, touchAction: "pan-y" }} onPointerDown={swipeStart} onPointerUp={swipeEnd} onClick={openAtTime}>{!dayHours.on ? <div className="h-full flex items-center justify-center text-sm text-[var(--ink-soft)]">Выходной</div> : <>{Array.from({ length: Math.floor((gridEnd - gridStart) / 60) + 1 }, (_, i) => <div key={i} className="absolute left-10 right-0 border-t border-[var(--line)]" style={{ top: i * HOUR_H }}><span className="absolute right-full mr-2 -mt-1.5 text-[11px] font-mono text-[var(--ink-soft)]">{time(gridStart + i * 60)}</span></div>)}{dayHours.breakStart && dayHours.breakEnd && minutes(dayHours.breakEnd) > minutes(dayHours.breakStart) && <div className="absolute left-10 right-0 bg-[var(--surface-alt)] opacity-60" style={{ top: ((minutes(dayHours.breakStart) - gridStart) / 60) * HOUR_H, height: ((minutes(dayHours.breakEnd) - minutes(dayHours.breakStart)) / 60) * HOUR_H }}><span className="absolute right-2 top-2 text-[10px] text-[var(--ink-soft)]">Перерыв</span></div>}{dayAppts.map((a) => { const isDrag = drag?.id === a.id; const top = isDrag ? drag.currentTop : ((minutes(a.start_time) - gridStart) / 60) * HOUR_H; const height = Math.max((a.duration / 60) * HOUR_H, 40); const color = a.services?.color || "var(--moss)"; return <div key={a.id} data-appointment className="absolute left-10 right-0 rounded-xl px-3 py-2 overflow-hidden select-none" style={{ top, height, background: `${color}26`, borderLeft: `3px solid ${color}`, zIndex: isDrag ? 10 : 2, boxShadow: selectedId === a.id ? `0 0 0 2px ${color}` : "none" }} onClick={(e) => { e.stopPropagation(); setSelectedId(a.id); }}><div className="text-xs font-medium">{isDrag ? time(gridStart + (drag.currentTop / HOUR_H) * 60) : a.start_time} · {a.clients?.name || "Клиент"}</div><div className="text-[11px] text-[var(--ink-soft)]">{a.services?.name}{a.status === "done" ? " · Оплачено" : ""}</div><div onPointerDown={(e) => dragStart(e, a)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center" style={{ touchAction: "none" }}><GripVertical size={16} className="text-[var(--ink-soft)]" /></div></div>; })}</>}</div>}
    {selected && <><div className="fixed inset-0 z-20 bg-black/25" onClick={() => setSelectedId(null)} /><div className="fixed left-0 right-0 bottom-0 max-w-sm mx-auto z-30 rounded-t-3xl px-5 pt-4 pb-7 bg-[var(--surface)] shadow-2xl"><div className="mx-auto w-9 h-1 rounded-full bg-[var(--line)] mb-4" /><div className="flex justify-between"><div><div className="text-lg font-serif">{selected.clients?.name || "Клиент"}</div><div className="text-sm text-[var(--ink-soft)] mt-1">{selected.start_time}–{selectedEnd} · {selected.duration} мин</div><div className="mt-2 flex flex-col gap-1.5">{servicesForSelected.map((s, i) => <div key={`${s.name}-${i}`} className="flex items-center gap-2 text-sm text-[var(--ink-soft)]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color || "var(--moss)" }} /><span>{s.name}</span></div>)}</div><div className="text-xs mt-1 text-[var(--ink-soft)]">{servicesForSelected.length > 1 ? `${servicesForSelected.length} услуги · ${selected.duration} мин` : "Услуга"}</div><div className="text-sm font-mono mt-2">{Number(selected.price || 0).toLocaleString("ru-RU")} ₽</div><div className="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ background: selected.status === "done" ? "var(--moss-soft)" : "var(--surface-alt)", color: selected.status === "done" ? "var(--moss)" : "var(--ink-soft)" }}>{selected.status === "done" ? "Оплачено" : "Не оплачено"}</div></div><button onClick={() => setSelectedId(null)} className="rounded-full p-2 bg-[var(--surface-alt)]"><X size={16} /></button></div><div className="flex gap-2 mt-4"><Link to={`/appointment/${selected.id}`} className="flex-1 rounded-full py-3 text-sm text-center" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>Изменить</Link><button onClick={cancel} className="rounded-full px-4 py-3 text-sm bg-[var(--clay-soft)]">Отмена</button></div>{selected.status !== "done" && <>{completeOpen ? <div className="mt-3 flex gap-2"><button onClick={() => complete("Наличные")} className="flex-1 rounded-full py-2.5 bg-[var(--moss)] text-[var(--on-accent)]">Наличные</button><button onClick={() => complete("Карта")} className="flex-1 rounded-full py-2.5 bg-[var(--moss)] text-[var(--on-accent)]">Карта</button></div> : <button onClick={() => setCompleteOpen(true)} className="w-full mt-3 rounded-full py-3 text-sm bg-[var(--surface-alt)]"><Check size={15} className="inline mr-1" />Завершить и принять оплату</button>}</>}</div></>}
    {pickerOpen && <><div className="fixed inset-0 z-40 bg-black/30" onClick={() => setPickerOpen(false)} /><div className="fixed left-0 right-0 bottom-0 max-w-sm mx-auto z-50 rounded-t-3xl p-5 bg-[var(--surface)]"><div className="flex items-center justify-between"><button onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))} className="p-2 rounded-full bg-[var(--surface-alt)]"><ChevronLeft size={17} /></button><div className="text-lg font-serif capitalize">{pickerMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</div><button onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))} className="p-2 rounded-full bg-[var(--surface-alt)]"><ChevronRight size={17} /></button></div><div className="grid grid-cols-7 gap-1 mt-4">{WEEKDAYS.map((w) => <div key={w} className="text-[10px] text-center text-[var(--ink-soft)] py-1">{w}</div>)}{monthCells.map((d, i) => d ? <button key={i} onClick={() => { goDate(d); setPickerOpen(false); }} className="aspect-square rounded-xl text-sm" style={{ background: d.toDateString() === selectedDate.toDateString() ? "var(--moss)" : "transparent", color: d.toDateString() === selectedDate.toDateString() ? "var(--on-accent)" : "var(--ink)" }}>{d.getDate()}</button> : <span key={i} />)}</div><button onClick={() => { goDate(new Date()); setPickerOpen(false); }} className="w-full mt-4 rounded-full py-3 bg-[var(--surface-alt)] text-sm">Сегодня</button></div></>}
    <BottomNav /><Link to="/appointment/new" className="fixed rounded-full flex items-center justify-center shadow-lg" style={{ background: "var(--clay)", color: "#FBF9F3", width: 44, height: 44, bottom: 88, right: "calc(50% - 176px)" }}><Plus size={20} /></Link>
  </div></div>;
}
