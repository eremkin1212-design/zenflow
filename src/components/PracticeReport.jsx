import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Clock, Users, Scissors, ChevronRight as Arrow } from "lucide-react";
import { getServiceBreakdown, getDoneAppointments, getVisitHistory } from "../data/reports";
import { getProfile } from "../data/profile";
import { fmtDate } from "../data/appointments";
import { useAuth } from "../auth";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function minutes(t) { const [h, m] = String(t || "00:00").split(":").map(Number); return h * 60 + m; }
function parseDate(value) { const [y, m, d] = String(value).split("-").map(Number); return new Date(y, m - 1, d); }
function money(n) { return `${Math.round(n).toLocaleString("ru-RU")} ₽`; }
function hours(mins) { const h = Math.floor(mins / 60); const m = mins % 60; return m ? `${h} ч ${m} мин` : `${h} ч`; }

// Сколько рабочего времени было доступно в месяце по графику из настроек.
function capacityForMonth(schedule, month) {
const dates = schedule && !Array.isArray(schedule) && schedule.dates ? schedule.dates : {};
let total = 0;
let days = 0;
const cursor = new Date(month.getFullYear(), month.getMonth(), 1);
const last = endOfMonth(month);
while (cursor <= last) {
const item = dates[fmtDate(cursor)];
if (item?.on) {
const brk = item.breakStart && item.breakEnd ? Math.max(0, minutes(item.breakEnd) - minutes(item.breakStart)) : 0;
total += Math.max(0, minutes(item.end) - minutes(item.start) - brk);
days += 1;
}
cursor.setDate(cursor.getDate() + 1);
}
return { minutes: total, days };
}

function Delta({ now, before, kind = "money" }) {
if (!before) return null;
const diff = now - before;
const percent = Math.round((diff / before) * 100);
if (percent === 0) {
return <span className="text-[11px] text-[var(--ink-soft)] flex items-center gap-0.5"><Minus size={11} /> как в прошлом месяце</span>;
}
const up = diff > 0;
const Icon = up ? TrendingUp : TrendingDown;
return (
<span className="text-[11px] flex items-center gap-0.5" style={{ color: up ? "var(--moss)" : "var(--clay)" }}>
<Icon size={11} /> {up ? "+" : ""}{percent}% {kind === "money" ? `(${up ? "+" : ""}${money(diff)})` : ""}
</span>
);
}

export default function PracticeReport() {
const { user } = useAuth();
const [month, setMonth] = useState(() => startOfMonth(new Date()));
const [state, setState] = useState("loading");
const [data, setData] = useState(null);

useEffect(() => {
if (!user) return;
let dead = false;
setState("loading");
const prev = startOfMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
Promise.all([
getDoneAppointments(startOfMonth(month), endOfMonth(month)),
getDoneAppointments(prev, endOfMonth(prev)),
getServiceBreakdown(startOfMonth(month), endOfMonth(month)),
getVisitHistory(),
getProfile(user.id),
])
.then(([current, previous, services, history, profile]) => {
if (dead) return;
setData({ current, previous, services, history, schedule: profile?.working_hours || null });
setState("ready");
})
.catch(() => { if (!dead) setState("error"); });
return () => { dead = true; };
}, [user, month]);

const report = useMemo(() => {
if (!data) return null;
const { current, previous, services, history, schedule } = data;

const revenue = current.reduce((s, a) => s + Number(a.price || 0), 0);
const prevRevenue = previous.reduce((s, a) => s + Number(a.price || 0), 0);
const busyMinutes = current.reduce((s, a) => s + Number(a.duration || 0), 0);
const avg = current.length ? revenue / current.length : 0;
const prevAvg = previous.length ? prevRevenue / previous.length : 0;

// Услуги
const byService = new Map();
services.forEach((row) => {
const name = row.services?.name || "Без услуги";
const prev = byService.get(name) || { name, color: row.services?.color || "var(--moss)", count: 0, revenue: 0 };
prev.count += 1;
prev.revenue += Number(row.price || 0);
byService.set(name, prev);
});
const serviceList = [...byService.values()].sort((a, b) => b.revenue - a.revenue);
const serviceTotal = serviceList.reduce((s, x) => s + x.revenue, 0);

// Загрузка по дням недели
const byWeekday = Array.from({ length: 7 }, () => ({ minutes: 0, count: 0 }));
current.forEach((a) => {
const idx = (parseDate(a.date).getDay() + 6) % 7;
byWeekday[idx].minutes += Number(a.duration || 0);
byWeekday[idx].count += 1;
});
const capacity = capacityForMonth(schedule, month);
const load = capacity.minutes ? Math.round((busyMinutes / capacity.minutes) * 100) : 0;

// Клиенты
const byClient = new Map();
history.forEach((a) => {
if (!a.client_id) return;
const prev = byClient.get(a.client_id) || { id: a.client_id, name: a.clients?.name || "Клиент", visits: 0, revenue: 0, last: null };
prev.visits += 1;
prev.revenue += Number(a.price || 0);
const d = parseDate(a.date);
if (!prev.last || d > prev.last) prev.last = d;
byClient.set(a.client_id, prev);
});
const clients = [...byClient.values()];
const today = new Date();
const daysSince = (d) => Math.floor((today - d) / 86400000);

const monthRevenueByClient = new Map();
current.forEach((a) => {
if (!a.client_id) return;
monthRevenueByClient.set(a.client_id, (monthRevenueByClient.get(a.client_id) || 0) + Number(a.price || 0));
});
const topClients = clients
.map((c) => ({ ...c, monthRevenue: monthRevenueByClient.get(c.id) || 0 }))
.filter((c) => c.monthRevenue > 0)
.sort((a, b) => b.monthRevenue - a.monthRevenue)
.slice(0, 5);

const notReturned = clients.filter((c) => c.visits === 1 && c.last && daysSince(c.last) > 30)
.sort((a, b) => a.last - b.last).slice(0, 5);
const lost = clients.filter((c) => c.visits >= 2 && c.last && daysSince(c.last) > 45)
.sort((a, b) => a.last - b.last).slice(0, 5);

return { revenue, prevRevenue, sessions: current.length, prevSessions: previous.length, avg, prevAvg, busyMinutes, capacity, load, serviceList, serviceTotal, byWeekday, topClients, notReturned, lost, daysSince };
}, [data, month]);

const isCurrentMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();

return (
<div className="mt-4">
<div className="mx-5 flex items-center gap-2 rounded-2xl p-2 bg-[var(--surface)] border border-[var(--line)]">
<button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Прошлый месяц" className="rounded-full p-2.5 bg-[var(--surface-alt)]"><ChevronLeft size={17} /></button>
<div className="flex-1 text-center text-sm font-medium">{MONTHS[month.getMonth()]} {month.getFullYear()}</div>
<button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} disabled={isCurrentMonth} aria-label="Следующий месяц" className="rounded-full p-2.5 bg-[var(--surface-alt)]" style={{ opacity: isCurrentMonth ? 0.4 : 1 }}><ChevronRight size={17} /></button>
</div>

{state === "loading" && <div className="text-sm text-center py-10 text-[var(--ink-soft)]">Считаем отчёт…</div>}
{state === "error" && <div className="text-sm text-center py-10 text-[var(--clay)]">Не удалось собрать отчёт</div>}

{state === "ready" && report && (
<>
{report.sessions === 0 ? (
<div className="mx-5 mt-4 rounded-2xl p-6 text-center text-sm bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-soft)]">
В этом месяце завершённых сеансов не было
</div>
) : (
<>
{/* Итоги */}
<div className="mx-5 mt-4 rounded-3xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-xs uppercase text-[var(--ink-soft)]" style={{ letterSpacing: ".08em" }}>Итоги месяца</div>
<div className="text-2xl font-mono mt-1" style={{ fontWeight: 500 }}>{money(report.revenue)}</div>
<div className="mt-1"><Delta now={report.revenue} before={report.prevRevenue} /></div>
<div className="grid grid-cols-2 gap-2.5 mt-4">
<div className="rounded-2xl p-3 bg-[var(--surface-alt)]">
<div className="text-lg font-mono">{report.sessions}</div>
<div className="text-[11px] text-[var(--ink-soft)]">сеансов</div>
<div className="mt-1"><Delta now={report.sessions} before={report.prevSessions} kind="count" /></div>
</div>
<div className="rounded-2xl p-3 bg-[var(--surface-alt)]">
<div className="text-lg font-mono">{money(report.avg)}</div>
<div className="text-[11px] text-[var(--ink-soft)]">средний чек</div>
<div className="mt-1"><Delta now={report.avg} before={report.prevAvg} /></div>
</div>
</div>
</div>

{/* Услуги */}
<div className="mx-5 mt-4">
<div className="text-sm font-medium mb-2 flex items-center gap-1.5 text-[var(--ink-soft)]"><Scissors size={14} /> Услуги</div>
<div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)] flex flex-col gap-3">
{report.serviceList.length === 0 && <div className="text-xs text-[var(--ink-soft)]">Нет данных по услугам</div>}
{report.serviceList.map((s) => {
const share = report.serviceTotal ? Math.round((s.revenue / report.serviceTotal) * 100) : 0;
return (
<div key={s.name}>
<div className="flex items-center justify-between text-sm">
<span className="flex items-center gap-2 min-w-0"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} /><span className="truncate">{s.name}</span></span>
<span className="font-mono shrink-0 ml-2">{money(s.revenue)}</span>
</div>
<div className="mt-1.5 h-1.5 rounded-full overflow-hidden bg-[var(--surface-alt)]">
<div className="h-full rounded-full" style={{ width: `${share}%`, background: s.color }} />
</div>
<div className="text-[11px] mt-1 text-[var(--ink-soft)]">{s.count} раз · {share}% выручки · в среднем {money(s.revenue / s.count)}</div>
</div>
);
})}
</div>
</div>

{/* Загрузка */}
<div className="mx-5 mt-4">
<div className="text-sm font-medium mb-2 flex items-center gap-1.5 text-[var(--ink-soft)]"><Clock size={14} /> Загрузка</div>
<div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
{report.capacity.minutes > 0 ? (
<>
<div className="flex items-end justify-between">
<div>
<div className="text-lg font-mono">{report.load}%</div>
<div className="text-[11px] text-[var(--ink-soft)]">занято {hours(report.busyMinutes)} из {hours(report.capacity.minutes)}</div>
</div>
<div className="text-[11px] text-right text-[var(--ink-soft)]">{report.capacity.days} рабочих дней</div>
</div>
<div className="mt-2 h-2 rounded-full overflow-hidden bg-[var(--surface-alt)]">
<div className="h-full rounded-full" style={{ width: `${Math.min(100, report.load)}%`, background: "var(--moss)" }} />
</div>
</>
) : (
<div className="text-xs text-[var(--ink-soft)]">Рабочее время на этот месяц не задано — загрузку посчитать не получится. Задать можно в Настройках.</div>
)}

<div className="flex items-end justify-between gap-1.5 mt-4" style={{ height: 70 }}>
{report.byWeekday.map((d, i) => {
const max = Math.max(...report.byWeekday.map((x) => x.minutes), 1);
const empty = d.minutes === 0;
return (
<div key={i} className="flex-1 flex flex-col items-center gap-1">
<div className="w-full rounded-md" style={{ height: Math.max((d.minutes / max) * 50, 3), background: empty ? "var(--line)" : "var(--moss)" }} />
<span className="text-[10px]" style={{ color: empty ? "var(--clay)" : "var(--ink-soft)" }}>{WEEKDAYS[i]}</span>
</div>
);
})}
</div>
<div className="text-[11px] mt-1 text-[var(--ink-soft)]">
{report.byWeekday.every((d) => d.minutes > 0)
? "Загружены все дни недели"
: `Простаивают: ${report.byWeekday.map((d, i) => (d.minutes === 0 ? WEEKDAYS[i] : null)).filter(Boolean).join(", ")}`}
</div>
</div>
</div>

{/* Клиенты */}
<div className="mx-5 mt-4">
<div className="text-sm font-medium mb-2 flex items-center gap-1.5 text-[var(--ink-soft)]"><Users size={14} /> Клиенты</div>

<div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-xs font-medium mb-2">Больше всех принесли</div>
<div className="flex flex-col gap-2">
{report.topClients.map((c) => (
<Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between text-sm">
<span className="truncate">{c.name}</span>
<span className="flex items-center gap-1 shrink-0 ml-2"><span className="font-mono">{money(c.monthRevenue)}</span><Arrow size={13} className="text-[var(--ink-soft)]" /></span>
</Link>
))}
</div>
</div>

{report.notReturned.length > 0 && (
<div className="mt-2.5 rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-xs font-medium mb-1">Были один раз и не вернулись</div>
<div className="text-[11px] mb-2 text-[var(--ink-soft)]">Стоит написать — возможно, что-то не подошло</div>
<div className="flex flex-col gap-2">
{report.notReturned.map((c) => (
<Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between text-sm">
<span className="truncate">{c.name}</span>
<span className="flex items-center gap-1 shrink-0 ml-2 text-[11px] text-[var(--ink-soft)]">{report.daysSince(c.last)} дн. назад<Arrow size={13} /></span>
</Link>
))}
</div>
</div>
)}

{report.lost.length > 0 && (
<div className="mt-2.5 rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-xs font-medium mb-1">Ходили постоянно, но пропали</div>
<div className="text-[11px] mb-2 text-[var(--ink-soft)]">Больше 45 дней без визита</div>
<div className="flex flex-col gap-2">
{report.lost.map((c) => (
<Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between text-sm">
<span className="truncate">{c.name}</span>
<span className="flex items-center gap-1 shrink-0 ml-2 text-[11px] text-[var(--ink-soft)]">{c.visits} визита · {report.daysSince(c.last)} дн.<Arrow size={13} /></span>
</Link>
))}
</div>
</div>
)}
</div>
</>
)}
</>
)}
</div>
);
}
