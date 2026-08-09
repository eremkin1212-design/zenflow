import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Pencil, X, Check, Phone, MessageCircle, CalendarCheck, Ban, Wallet, Clock as ClockIcon, ChevronRight as ChevronRightIcon, GripVertical } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getAppointmentsRange, updateAppointment, fmtDate } from "../data/appointments";
import { getClientById, ratingTag } from "../data/clients";

const DAY_START = 8 * 60;
const DAY_END = 20 * 60;
const HOUR_H = 64;
const GRID_HEIGHT = ((DAY_END - DAY_START) / 60) * HOUR_H;
const SNAP_MIN = 15;
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
  const [drag, setDrag] = useState(null); // { id, startY, startTop, currentTop, moved, duration, originalStart }

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

  const [clientDetail, setClientDetail] = useState(null);
  useEffect(() => {
    if (!selected?.clients?.id) { setClientDetail(null); return; }
    let cancelled = false;
    getClientById(selected.clients.id).then((c) => { if (!cancelled) setClientDetail(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, [selected?.clients?.id]);

  async function handleCompleteSelected() {
    if (!selected) return;
    try {
      await updateAppointment(selected.id, { status: "done" });
      setAppts((prev) => prev.map((a) => (a.id === selected.id ? { ...a, status: "done" } : a)));
      setSelectedId(null);
    } catch {
      window.alert("Не удалось завершить. Попробуй снова.");
    }
  }

  async function handleCancelSelected() {
    if (!selected) return;
    if (!window.confirm("Отменить эту запись?")) return;
    try {
      await updateAppointment(selected.id, { status: "cancelled" });
      setAppts((prev) => prev.map((a) => (a.id === selected.id ? { ...a, status: "cancelled" } : a)));
      setSelectedId(null);
    } catch {
      window.alert("Не удалось отменить. Попробуй снова.");
    }
  }

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

  function topToTime(top, duration) {
    const raw = DAY_START + (top / HOUR_H) * 60;
    const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
    const clamped = Math.max(DAY_START, Math.min(snapped, DAY_END - duration));
    return toTime(clamped);
  }

  function handlePointerDown(e, a) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const top = ((toMinutes(a.start_time) - DAY_START) / 60) * HOUR_H;
    setDrag({ id: a.id, startY: e.clientY, startTop: top, currentTop: top, moved: false, duration: a.duration, originalStart: a.start_time });
  }

  function handlePointerMove(e) {
    if (!drag) return;
    e.preventDefault();
    const deltaY = e.clientY - drag.startY;
    const height = Math.max((drag.duration / 60) * HOUR_H, 40);
    let newTop = drag.startTop + deltaY;
    newTop = Math.max(0, Math.min(newTop, GRID_HEIGHT - height));
    setDrag((d) => (d ? { ...d, currentTop: newTop, moved: d.moved || Math.abs(deltaY) > 4 } : d));
  }

  async function handlePointerUp(e) {
    e?.stopPropagation();
    if (!drag) return;
    const { id, moved, duration, originalStart, currentTop } = drag;
    if (!moved) {
      setSelectedId((prev) => (prev === id ? null : id));
      setDrag(null);
      return;
    }
    const newTime = topToTime(currentTop, duration);
    setDrag(null);
    if (newTime === originalStart) return;
    setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, start_time: newTime } : a)));
    try {
      await updateAppointment(id, { start_time: newTime });
    } catch {
      setAppts((prev) => prev.map((a) => (a.id === id ? { ...a, start_time: originalStart } : a)));
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
          <div className="mx-5 mt-5 relative" style={{ height: GRID_HEIGHT }}>
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
              const isDragging = drag?.id === a.id;
              const top = isDragging ? drag.currentTop : ((toMinutes(a.start_time) - DAY_START) / 60) * HOUR_H;
              const height = Math.max((a.duration / 60) * HOUR_H, 40);
              const isSel = selectedId === a.id;
              const color = a.services?.color || "#999";
              const liveTime = isDragging ? topToTime(drag.currentTop, a.duration) : a.start_time;
              return (
                <div
                  key={a.id}
                  role="button" tabIndex={0}
                  onClick={() => setSelectedId((prev) => (prev === a.id ? null : a.id))}
                  className="absolute left-10 right-0 rounded-xl text-left px-3 py-1.5 overflow-hidden select-none"
                  style={{
                    top, height, background: `${color}26`, borderLeft: `3px solid ${color}`,
                    boxShadow: isSel || isDragging ? `0 0 0 2px ${color}` : "none",
                    zIndex: isDragging ? 10 : 1,
                    transition: isDragging ? "none" : "top 0.15s ease",
                  }}
                >
                  <div className="text-xs font-medium pr-6">{liveTime} · {a.clients?.name || "Клиент удалён"}</div>
                  <div className="text-[11px] text-[var(--ink-soft)] pr-6">{a.services?.name}</div>

                  <div
                    onPointerDown={(e) => handlePointerDown(e, a)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Перенести запись"
                    className="absolute right-0.5 top-1/2 flex items-center justify-center"
                    style={{ width: 30, height: 30, marginTop: -15, touchAction: "none", cursor: "grab" }}
                  >
                    <GripVertical size={16} className="text-[var(--ink-soft)]" />
                  </div>
                </div>
              );
            })}

            {dayAppts.length === 0 && (
              <div className="text-sm text-center py-6 text-[var(--ink-soft)]">На этот день записей нет</div>
            )}
          </div>
        )}

        {selected && view === "day" && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setSelectedId(null)} style={{ background: "rgba(0,0,0,0.28)" }} />
            <div className="fixed left-0 right-0 bottom-0 max-w-sm mx-auto z-30 rounded-t-3xl px-5 pt-5 pb-7 max-h-[85vh] overflow-y-auto"
              style={{ background: "var(--surface)", boxShadow: "0 -12px 32px rgba(0,0,0,0.18)" }}>
              <div className="flex justify-center mb-3">
                <span className="w-9 h-1 rounded-full" style={{ background: "var(--line)" }} />
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full flex items-center justify-center font-serif shrink-0" style={{ width: 52, height: 52, background: "var(--moss-soft)", color: "var(--moss)", fontSize: 18, fontWeight: 500 }}>
                    {clientDetail?.initials || selected.clients?.name?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <div>
                    <div className="text-base font-serif" style={{ fontWeight: 500 }}>{selected.clients?.name || "Клиент удалён"}</div>
                    <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{clientDetail?.phone}</div>
                    {clientDetail && (
                      <span className="inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{
                        background: ratingTag(clientDetail).tone === "moss" ? "var(--moss)" : ratingTag(clientDetail).tone === "clay" ? "var(--clay)" : "var(--surface-alt)",
                        color: ratingTag(clientDetail).tone === "soft" ? "var(--ink-soft)" : "var(--on-accent)",
                      }}>
                        {ratingTag(clientDetail).label}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedId(null)} aria-label="Закрыть" className="rounded-full p-2 bg-[var(--surface-alt)]">
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button className="rounded-full p-3" style={{ background: "var(--moss)", color: "var(--on-accent)" }} aria-label="Позвонить"><Phone size={16} /></button>
                <button className="rounded-full p-3 bg-[var(--surface-alt)]" aria-label="Написать"><MessageCircle size={16} /></button>
                <Link to={`/clients/${selected.clients?.id}`} className="flex-1 rounded-full py-3 text-sm font-medium flex items-center justify-center gap-1 bg-[var(--surface-alt)]">
                  Полная карточка <ChevronRightIcon size={14} />
                </Link>
              </div>

              {clientDetail && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {[
                    { Icon: CalendarCheck, value: clientDetail.visits, label: "визитов" },
                    { Icon: Ban, value: clientDetail.cancellations, label: "отмен" },
                    { Icon: Wallet, value: `${clientDetail.avg_check.toLocaleString("ru-RU")}₽`, label: "чек" },
                    { Icon: ClockIcon, value: clientDetail.last_visit?.split(",")[0] || "—", label: "визит" },
                  ].map(({ Icon, value, label }, i) => (
                    <div key={i} className="rounded-xl p-2 text-center bg-[var(--surface-alt)]">
                      <Icon size={13} className="text-[var(--moss)] mx-auto" />
                      <div className="text-xs font-medium mt-1 font-mono truncate">{value}</div>
                      <div className="text-[10px] text-[var(--ink-soft)]">{label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: selected.services?.color || "var(--line)" }} />
                  <span className="text-sm font-medium">{selected.services?.name}</span>
                  <span className="text-sm font-mono ml-auto">{selected.price.toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="text-xs text-[var(--ink-soft)] mb-3 pl-4">
                  {selected.start_time}–{toTime(toMinutes(selected.start_time) + selected.duration)} · {selected.duration} мин
                </div>

                <div className="flex items-center justify-between rounded-2xl p-3 bg-[var(--surface-alt)]">
                  <span className="text-xs text-[var(--ink-soft)]">Перенос записи</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => moveSelected(-30)} aria-label="На 30 минут раньше" className="rounded-full p-1.5 bg-[var(--surface)]">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-sm font-mono w-11 text-center">{selected.start_time}</span>
                    <button onClick={() => moveSelected(30)} aria-label="На 30 минут позже" className="rounded-full p-1.5 bg-[var(--surface)]">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button onClick={handleCancelSelected} className="rounded-full p-3 flex items-center justify-center" style={{ background: "var(--clay-soft)", color: "var(--danger)" }} aria-label="Отменить запись">
                    <X size={16} />
                  </button>
                  <button onClick={handleCompleteSelected} className="rounded-full p-3 flex items-center justify-center bg-[var(--surface-alt)]" aria-label="Завершить сессию">
                    <Check size={16} />
                  </button>
                  <Link to={`/appointment/${selected.id}`} className="flex-1 rounded-full py-3 text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
                    <Pencil size={14} /> Изменить запись
                  </Link>
                </div>
              </div>
            </div>
          </>
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
