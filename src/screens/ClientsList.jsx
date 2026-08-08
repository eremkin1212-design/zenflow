import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, ChevronRight } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { CLIENTS, ratingTag } from "../data/clients";

export default function ClientsList() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CLIENTS;
    return CLIENTS.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  // сегодняшние клиенты — наверх, остальные — по числу визитов
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const aToday = a.lastVisit.startsWith("сегодня");
        const bToday = b.lastVisit.startsWith("сегодня");
        if (aToday !== bToday) return aToday ? -1 : 1;
        return b.visits - a.visits;
      }),
    [filtered]
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

        <div className="text-xs mt-4 mx-5 text-[var(--ink-soft)]">
          {sorted.length} {sorted.length === 1 ? "клиент" : "клиентов"}
        </div>

        <div className="mx-5 mt-2 flex flex-col gap-2.5">
          {sorted.map((c) => {
            const tag = ratingTag(c);
            const tagBg = tag.tone === "moss" ? "var(--moss)" : tag.tone === "clay" ? "var(--clay)" : "var(--surface-alt)";
            const tagFg = tag.tone === "soft" ? "var(--ink-soft)" : "var(--on-accent)";
            return (
              <Link
                key={c.id} to={`/clients/${c.id}`}
                className="rounded-2xl p-3.5 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]"
              >
                <div className="rounded-full flex items-center justify-center shrink-0 font-serif" style={{ width: 44, height: 44, background: "var(--moss-soft)", color: "var(--moss)", fontWeight: 500 }}>
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs mt-0.5 text-[var(--ink-soft)] truncate">{c.lastVisit} · {c.favoriteService}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: tagBg, color: tagFg }}>
                    {tag.label}
                  </span>
                </div>
                <ChevronRight size={16} className="text-[var(--ink-soft)] shrink-0" />
              </Link>
            );
          })}

          {sorted.length === 0 && (
            <div className="text-sm text-center py-8 text-[var(--ink-soft)]">Никого не нашлось</div>
          )}
        </div>

        <BottomNav />

        <button
          aria-label="Новый клиент"
          className="fixed rounded-full flex items-center justify-center shadow-lg"
          style={{ background: "var(--clay)", color: "#FBF9F3", width: 44, height: 44, bottom: 88, right: "calc(50% - 176px)" }}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
