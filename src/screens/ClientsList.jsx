import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, ChevronRight, CalendarPlus, MessageCircle } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getClients, ratingTag } from "../data/clients";
import { getClientsDueForVisit } from "../data/clientFollowUp";

function pluralVisits(n) {
  return n === 1 ? "посещение" : n < 5 ? "посещения" : "посещений";
}

export default function ClientsList() {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState([]);
  const [due, setDue] = useState({});
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    getClients()
      .then(async (data) => {
        if (cancelled) return;
        setClients(data);
        try {
          const ids = data.map((c) => c.id);
          const followUp = await getClientsDueForVisit(ids);
          if (!cancelled) setDue(followUp);
        } catch {
          if (!cancelled) setDue({});
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
    () => [...filtered].sort((a, b) => b.visits - a.visits),
    [filtered]
  );

  const dueClients = useMemo(
    () => clients
      .filter((c) => due[c.id])
      .sort((a, b) => Number(due[b.id]?.elapsed || 0) - Number(due[a.id]?.elapsed || 0)),
    [clients, due]
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-center justify-between px-5 pt-7 pb-3">
          <div className="text-2xl font-serif" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>Клиенты</div>
          <ThemeToggle />
        </div>

        <div className="mx-5 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--line)]">
          <Search size={16} className="text-[var(--ink-soft)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск клиента"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        {status === "loading" && (
          <div className="text-sm text-center py-10 text-[var(--ink-soft)]">Загружаем клиентов…</div>
        )}

        {status === "error" && (
          <div className="text-sm text-center py-10 text-[var(--clay)]">
            Не удалось загрузить клиентов. Проверь подключение и обнови страницу.
          </div>
        )}

        {status === "ready" && (
          <>
            {dueClients.length > 0 && !query.trim() && (
              <section className="mx-5 mt-5">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-sm font-medium">Пора записать</div>
                  <div className="text-xs text-[var(--ink-soft)]">{dueClients.length}</div>
                </div>
                <div className="flex flex-col gap-2.5">
                  {dueClients.map((c) => {
                    const f = due[c.id];
                    return (
                      <div key={c.id} className="rounded-2xl p-3.5 bg-[var(--moss-soft)] border border-[var(--line)]">
                        <div className="flex items-center gap-3">
                          <Link to={`/clients/${c.id}`} className="rounded-full flex items-center justify-center shrink-0 font-serif" style={{ width: 42, height: 42, background: "var(--surface)", color: "var(--moss)", fontWeight: 500 }}>
                            {c.initials}
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to={`/clients/${c.id}`} className="text-sm font-medium truncate block">{c.name}</Link>
                            <div className="text-xs mt-0.5 text-[var(--ink-soft)]">
                              Обычно каждые {f.interval} дн. · прошло {f.elapsed} дн.
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Link to={`/appointment/new?clientId=${encodeURIComponent(c.id)}`} className="flex-1 rounded-xl py-2.5 text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
                            <CalendarPlus size={14} /> Записать
                          </Link>
                          <a href={`sms:${c.phone || ""}`} className="rounded-xl px-3 py-2.5 bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center" aria-label={`Написать ${c.name}`}>
                            <MessageCircle size={14} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="text-xs mt-5 mx-5 text-[var(--ink-soft)]">
              {sorted.length} {sorted.length === 1 ? "клиент" : "клиентов"}
            </div>

            <div className="mx-5 mt-2 flex flex-col gap-2.5">
              {sorted.map((c) => {
                const tag = ratingTag(c);
                const tagBg = tag.tone === "moss" ? "var(--moss)" : tag.tone === "clay" ? "var(--clay)" : "var(--surface-alt)";
                const tagFg = tag.tone === "soft" ? "var(--ink-soft)" : "var(--on-accent)";
                const visitText = Number(c.visits || 0) > 0
                  ? `${c.visits} ${pluralVisits(Number(c.visits))}`
                  : "Нет визитов";
                const detailText = Number(c.visits || 0) > 0
                  ? `${visitText} · ${c.last_visit || ""}`
                  : "Нет визитов";
                return (
                  <Link key={c.id} to={`/clients/${c.id}`} className="rounded-2xl p-3.5 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]">
                    <div className="rounded-full flex items-center justify-center shrink-0 font-serif" style={{ width: 44, height: 44, background: "var(--moss-soft)", color: "var(--moss)", fontWeight: 500 }}>
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs mt-0.5 text-[var(--ink-soft)] truncate">{detailText}</div>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0" style={{ background: tagBg, color: tagFg }}>
                      {tag.label}
                    </span>
                    <ChevronRight size={16} className="text-[var(--ink-soft)] shrink-0" />
                  </Link>
                );
              })}

              {sorted.length === 0 && (
                <div className="text-sm text-center py-8 text-[var(--ink-soft)]">Никого не нашлось</div>
              )}
            </div>
          </>
        )}

        <BottomNav />
        <Link to="/clients/new" aria-label="Новый клиент" className="fixed rounded-full flex items-center justify-center shadow-lg" style={{ background: "var(--clay)", color: "#FBF9F3", width: 44, height: 44, bottom: 88, right: "calc(50% - 176px)" }}>
          <Plus size={20} />
        </Link>
      </div>
    </div>
  );
}
