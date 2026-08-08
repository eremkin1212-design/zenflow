import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, Plus, CalendarCheck, Ban, Wallet, Clock, Image as ImageIcon } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";

const CLIENT = {
  name: "Анна Ким", phone: "+7 916 000-00-00", initials: "АК",
  visits: 14, cancellations: 0, avgCheck: 3800, nextVisit: "сегодня, 13:00",
};

const HISTORY = [
  { id: 1, date: "31 июл", service: "Лимфодренаж", color: "#9C8FB0", price: 3800 },
  { id: 2, date: "14 июл", service: "Лимфодренаж", color: "#9C8FB0", price: 3800 },
  { id: 3, date: "29 июн", service: "Классический массаж", color: "#7C9A86", price: 4200 },
  { id: 4, date: "12 июн", service: "Лимфодренаж", color: "#9C8FB0", price: 3800 },
];

const PAYMENTS = [
  { id: 1, date: "31 июл", amount: 3800, method: "Карта" },
  { id: 2, date: "14 июл", amount: 3800, method: "Наличные" },
  { id: 3, date: "29 июн", amount: 4200, method: "Карта" },
];

const NOTES = [
  { id: 1, date: "31 июл", text: "Просит поменьше давления в области поясницы." },
  { id: 2, date: "14 июл", text: "Хорошо реагирует на тёплое масло, любит тишину во время сессии." },
];

const TABS = [
  { key: "history", label: "История" },
  { key: "payments", label: "Оплаты" },
  { key: "notes", label: "Заметки" },
  { key: "photos", label: "Фото" },
  { key: "recs", label: "Рекомендации" },
];

function ratingTag(c) {
  if (c.visits >= 10 && c.cancellations === 0) return { label: "Постоянный клиент", tone: "moss" };
  if (c.visits <= 2) return { label: "Новый клиент", tone: "clay" };
  return { label: "Обычный клиент", tone: "soft" };
}

export default function ClientCard() {
  const [tab, setTab] = useState("history");
  const tag = ratingTag(CLIENT);
  const tagBg = tag.tone === "moss" ? "var(--moss)" : tag.tone === "clay" ? "var(--clay)" : "var(--surface-alt)";
  const tagFg = tag.tone === "soft" ? "var(--ink-soft)" : "var(--on-accent)";

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-center justify-between px-5 pt-7 pb-2">
          <Link to="/" aria-label="Назад" className="rounded-full p-2.5 bg-[var(--surface-alt)] border border-[var(--line)]">
            <ArrowLeft size={18} />
          </Link>
          <div className="text-sm font-medium text-[var(--ink-soft)]">Карточка клиента</div>
          <ThemeToggle />
        </div>

        <div className="flex flex-col items-center mt-3 px-5">
          <div className="rounded-full flex items-center justify-center font-serif" style={{ width: 76, height: 76, background: "var(--moss-soft)", color: "var(--moss)", fontSize: 26, fontWeight: 500 }}>
            {CLIENT.initials}
          </div>
          <div className="mt-3 text-xl font-serif" style={{ fontWeight: 500 }}>{CLIENT.name}</div>
          <div className="text-sm mt-0.5 text-[var(--ink-soft)]">{CLIENT.phone}</div>
          <div className="mt-2 rounded-full px-3 py-1 text-xs font-medium" style={{ background: tagBg, color: tagFg }}>{tag.label}</div>

          <div className="flex items-center gap-3 mt-4">
            <button className="rounded-full p-3" style={{ background: "var(--moss)", color: "var(--on-accent)" }} aria-label="Позвонить"><Phone size={17} /></button>
            <button className="rounded-full p-3 bg-[var(--surface-alt)] border border-[var(--line)]" aria-label="Написать"><MessageCircle size={17} /></button>
            <Link to="/appointment/new" className="rounded-full px-4 py-3 text-sm font-medium flex items-center gap-1.5" style={{ background: "var(--clay)", color: "#FBF9F3" }}>
              <Plus size={15} /> Записать
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mx-5 mt-5">
          {[
            { Icon: CalendarCheck, value: CLIENT.visits, label: "посещений" },
            { Icon: Ban, value: CLIENT.cancellations, label: "отмен" },
            { Icon: Wallet, value: `${CLIENT.avgCheck.toLocaleString("ru-RU")} ₽`, label: "средний чек" },
            { Icon: Clock, value: CLIENT.nextVisit, label: "следующая запись" },
          ].map(({ Icon, value, label }, i) => (
            <div key={i} className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
              <Icon size={16} className="text-[var(--moss)]" />
              <div className="mt-2 text-base font-medium font-mono">{value}</div>
              <div className="text-[11px] mt-0.5 text-[var(--ink-soft)]">{label}</div>
            </div>
          ))}
        </div>

        <div className="zf-tabs flex gap-2 mx-5 mt-5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key} onClick={() => setTab(t.key)}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium border"
              style={{ background: tab === t.key ? "var(--moss)" : "var(--surface-alt)", color: tab === t.key ? "var(--on-accent)" : "var(--ink-soft)", borderColor: tab === t.key ? "transparent" : "var(--line)" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mx-5 mt-4">
          {tab === "history" && (
            <div className="flex flex-col gap-2.5">
              {HISTORY.map((h) => (
                <div key={h.id} className="rounded-2xl p-3.5 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: h.color }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{h.service}</div>
                    <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{h.date}</div>
                  </div>
                  <div className="text-sm font-mono">{h.price.toLocaleString("ru-RU")} ₽</div>
                </div>
              ))}
            </div>
          )}

          {tab === "payments" && (
            <div className="flex flex-col gap-2.5">
              <div className="rounded-2xl p-3.5 flex items-center justify-between bg-[var(--moss-soft)]">
                <span className="text-sm text-[var(--ink-soft)]">Всего оплачено</span>
                <span className="text-base font-medium font-mono">{PAYMENTS.reduce((s, p) => s + p.amount, 0).toLocaleString("ru-RU")} ₽</span>
              </div>
              {PAYMENTS.map((p) => (
                <div key={p.id} className="rounded-2xl p-3.5 flex items-center justify-between bg-[var(--surface)] border border-[var(--line)]">
                  <div>
                    <div className="text-sm font-medium">{p.method}</div>
                    <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{p.date}</div>
                  </div>
                  <div className="text-sm font-mono">{p.amount.toLocaleString("ru-RU")} ₽</div>
                </div>
              ))}
            </div>
          )}

          {tab === "notes" && (
            <div className="flex flex-col gap-2.5">
              <button className="rounded-2xl p-3.5 text-sm text-left flex items-center gap-2 border border-dashed border-[var(--line)] text-[var(--ink-soft)]">
                <Plus size={15} /> Добавить заметку
              </button>
              {NOTES.map((n) => (
                <div key={n.id} className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
                  <div className="text-sm">{n.text}</div>
                  <div className="text-xs mt-1.5 text-[var(--ink-soft)]">{n.date}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "photos" && (
            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-2xl aspect-square flex items-center justify-center bg-[var(--surface-alt)] border border-[var(--line)]">
                  <ImageIcon size={20} className="text-[var(--ink-soft)]" />
                </div>
              ))}
              <button className="rounded-2xl aspect-square flex items-center justify-center border border-dashed border-[var(--line)]" aria-label="Добавить фото">
                <Plus size={20} className="text-[var(--moss)]" />
              </button>
            </div>
          )}

          {tab === "recs" && (
            <div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
              <div className="text-sm leading-relaxed">
                Рекомендовать курс из 4 сеансов лимфодренажа с интервалом 2 недели.
                Обратить внимание на поясничную область — просила снизить давление на последнем сеансе.
              </div>
              <button className="mt-3 text-sm font-medium text-[var(--moss)]">Изменить рекомендации</button>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
