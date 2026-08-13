import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, ChevronRight } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getClients, ratingTag } from "../data/clients";
import { getClientsDueForVisit } from "../data/clientFollowUp";
import ClientFollowUpCard from "../components/ClientFollowUpCard";

const FOLLOW_UP_LIMIT = 3;

export default function ClientsList() {
const [query, setQuery] = useState("");
const [clients, setClients] = useState([]);
const [followUps, setFollowUps] = useState({});
const [status, setStatus] = useState("loading");

useEffect(() => {
let cancelled = false;
getClients()
.then(async (data) => {
if (cancelled) return;
setClients(data);
try {
const due = await getClientsDueForVisit(data.map((c) => c.id));
if (!cancelled) setFollowUps(due);
} catch {
if (!cancelled) setFollowUps({});
}
if (!cancelled) setStatus("ready");
})
.catch(() => { if (!cancelled) setStatus("error"); });
return () => { cancelled = true; };
}, []);

const filtered = useMemo(() => {
const q = query.trim().toLowerCase();
if (!q) return clients;
return clients.filter((c) => c.name.toLowerCase().includes(q));
}, [query, clients]);

const sorted = useMemo(
() => [...filtered].sort((a, b) => {
const aToday = a.last_visit?.startsWith("сегодня");
const bToday = b.last_visit?.startsWith("сегодня");
if (aToday !== bToday) return aToday ? -1 : 1;
return b.visits - a.visits;
}),
[filtered]
);

const dueClients = useMemo(
() => clients.filter((c) => followUps[c.id]).sort((a, b) => followUps[b.id].elapsed - followUps[a.id].elapsed),
[clients, followUps]
);

// Блок «Пора записать» показываем только когда не ищем — при поиске
// нужен полный список, чтобы найти можно было любого клиента.
const searching = query.trim().length > 0;
const shownDue = useMemo(() => (searching ? [] : dueClients.slice(0, FOLLOW_UP_LIMIT)), [searching, dueClients]);
const shownDueIds = useMemo(() => new Set(shownDue.map((c) => c.id)), [shownDue]);
const restClients = useMemo(() => sorted.filter((c) => !shownDueIds.has(c.id)), [sorted, shownDueIds]);

return (
<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
<div className="max-w-sm mx-auto relative pb-24">
<div className="flex items-center justify-between px-5 pt-7 pb-3">
<div className="text-2xl font-serif" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>Клиенты</div>
<ThemeToggle />
</div>

<div className="mx-5 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--line)]">
<Search size={16} className="text-[var(--ink-soft)]" />
<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск клиента" className="flex-1 bg-transparent outline-none text-sm" />
</div>

{status === "loading" && <div className="text-sm text-center py-10 text-[var(--ink-soft)]">Загружаем клиентов…</div>}
{status === "error" && <div className="text-sm text-center py-10 text-[var(--clay)]">Не удалось загрузить клиентов. Проверь подключение и обнови страницу.</div>}

{status === "ready" && (
<>
{shownDue.length > 0 && (
<section className="mx-5 mt-5">
<div className="flex items-center justify-between mb-2">
<div className="text-sm font-medium">Пора записать</div>
<div className="text-xs text-[var(--ink-soft)]">{dueClients.length}</div>
</div>
<div className="flex flex-col gap-2.5">
{shownDue.map((client) => <ClientFollowUpCard key={client.id} client={client} followUp={followUps[client.id]} />)}
</div>
</section>
)}

<div className="text-xs mt-5 mx-5 text-[var(--ink-soft)]">
{shownDue.length > 0 ? "Остальные клиенты" : `${restClients.length} ${restClients.length === 1 ? "клиент" : "клиентов"}`}
</div>

<div className="mx-5 mt-2 flex flex-col gap-2.5">
{restClients.map((c) => {
const tag = ratingTag(c);
const tagBg = tag.tone === "moss" ? "var(--moss)" : tag.tone === "clay" ? "var(--clay)" : "var(--surface-alt)";
const tagFg = tag.tone === "soft" ? "var(--ink-soft)" : "var(--on-accent)";
const visits = Number(c.visits || 0);
const visitText = visits > 0 ? `${visits} ${visits === 1 ? "посещение" : visits < 5 ? "посещения" : "посещений"}` : "Нет визитов";
const detailText = visits > 0 ? `${visitText} · ${c.last_visit || ""}` : "Нет визитов";
return (
<Link key={c.id} to={`/clients/${c.id}`} className="rounded-2xl p-3.5 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]">
<div className="rounded-full flex items-center justify-center shrink-0 font-serif" style={{ width: 44, height: 44, background: "var(--moss-soft)", color: "var(--moss)", fontWeight: 500 }}>{c.initials}</div>
<div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{c.name}</div><div className="text-xs mt-0.5 text-[var(--ink-soft)] truncate">{detailText}</div></div>
<span className="rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0" style={{ background: tagBg, color: tagFg }}>{tag.label}</span>
<ChevronRight size={16} className="text-[var(--ink-soft)] shrink-0" />
</Link>
);
})}
{restClients.length === 0 && <div className="text-sm text-center py-8 text-[var(--ink-soft)]">{searching ? "Никого не нашлось" : "Все клиенты в блоке выше"}</div>}
</div>
</>
)}

<BottomNav />
<Link to="/clients/new" aria-label="Новый клиент" className="fixed rounded-full flex items-center justify-center shadow-lg" style={{ background: "var(--clay)", color: "#FBF9F3", width: 44, height: 44, bottom: 88, right: "calc(50% - 176px)" }}><Plus size={20} /></Link>
</div>
</div>
);
}
