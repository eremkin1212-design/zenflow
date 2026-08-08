import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, Receipt } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";

const PERIODS = [["day", "День"], ["week", "Неделя"], ["month", "Месяц"]];

const WEEK = [
  { day: "Пн", income: 12400, expense: 2000 },
  { day: "Вт", income: 8600, expense: 0 },
  { day: "Ср", income: 15200, expense: 3400 },
  { day: "Чт", income: 9800, expense: 0 },
  { day: "Пт", income: 18400, expense: 5200 },
  { day: "Сб", income: 21000, expense: 0 },
  { day: "Вс", income: 6200, expense: 1200 },
];

const TRANSACTIONS = [
  { id: 1, type: "income", clientId: 1, title: "Марина Соколова", subtitle: "Классический массаж", amount: 4200, time: "09:00" },
  { id: 2, type: "income", clientId: 2, title: "Игорь Плетнёв", subtitle: "Спортивный массаж", amount: 5200, time: "10:30" },
  { id: 3, type: "expense", clientId: null, title: "Расходники", subtitle: "Масло, полотенца", amount: 2000, time: "11:15" },
  { id: 4, type: "income", clientId: 3, title: "Анна Ким", subtitle: "Лимфодренаж", amount: 3800, time: "13:00" },
  { id: 5, type: "expense", clientId: null, title: "Аренда кабинета", subtitle: "Ежемесячный платёж", amount: 3200, time: "15:00" },
];

export default function Finance() {
  const [period, setPeriod] = useState("week");

  const totals = useMemo(() => {
    const income = WEEK.reduce((s, d) => s + d.income, 0);
    const expense = WEEK.reduce((s, d) => s + d.expense, 0);
    const checks = TRANSACTIONS.filter((t) => t.type === "income");
    const avgCheck = Math.round(checks.reduce((s, t) => s + t.amount, 0) / checks.length);
    return { income, expense, profit: income - expense, avgCheck };
  }, []);
  const maxVal = Math.max(...WEEK.map((d) => d.income));

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-center justify-between px-5 pt-7 pb-3">
          <div className="text-2xl font-serif" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>Финансы</div>
          <ThemeToggle />
        </div>

        <div className="mx-5 flex rounded-full p-1 bg-[var(--surface-alt)] border border-[var(--line)]">
          {PERIODS.map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} className="flex-1 rounded-full py-2 text-sm font-medium"
              style={{ background: period === key ? "var(--moss)" : "transparent", color: period === key ? "var(--on-accent)" : "var(--ink-soft)" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mx-5 mt-4">
          <div className="rounded-2xl p-3.5" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
            <ArrowUpRight size={16} />
            <div className="mt-2 text-lg font-medium font-mono">{totals.income.toLocaleString("ru-RU")} ₽</div>
            <div className="text-[11px] mt-0.5 opacity-85">доход за неделю</div>
          </div>
          <div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
            <ArrowDownRight size={16} className="text-[var(--clay)]" />
            <div className="mt-2 text-lg font-medium font-mono">{totals.expense.toLocaleString("ru-RU")} ₽</div>
            <div className="text-[11px] mt-0.5 text-[var(--ink-soft)]">расход за неделю</div>
          </div>
          <div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
            <Wallet size={16} className="text-[var(--moss)]" />
            <div className="mt-2 text-lg font-medium font-mono">{totals.profit.toLocaleString("ru-RU")} ₽</div>
            <div className="text-[11px] mt-0.5 text-[var(--ink-soft)]">прибыль</div>
          </div>
          <div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
            <Receipt size={16} className="text-[var(--clay)]" />
            <div className="mt-2 text-lg font-medium font-mono">{totals.avgCheck.toLocaleString("ru-RU")} ₽</div>
            <div className="text-[11px] mt-0.5 text-[var(--ink-soft)]">средний чек</div>
          </div>
        </div>

        <div className="mx-5 mt-5 rounded-3xl p-4 bg-[var(--surface)] border border-[var(--line)]">
          <div className="text-sm font-medium mb-4 text-[var(--ink-soft)]">Доход по дням</div>
          <div className="flex items-end justify-between gap-2" style={{ height: 110 }}>
            {WEEK.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-full rounded-lg" style={{ height: Math.max((d.income / maxVal) * 90, 6), background: "var(--moss)", opacity: 0.4 + (d.income / maxVal) * 0.6 }} />
                <span className="text-[10px] text-[var(--ink-soft)]">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-2.5 text-[var(--ink-soft)]">Операции сегодня</div>
          <div className="flex flex-col gap-2.5">
            {TRANSACTIONS.map((t) => {
              const Wrapper = t.clientId ? Link : "div";
              const wrapperProps = t.clientId ? { to: `/clients/${t.clientId}` } : {};
              return (
                <Wrapper key={t.id} {...wrapperProps} className="rounded-2xl p-3.5 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]">
                  <div className="rounded-full p-2" style={{ background: t.type === "income" ? "var(--moss-soft)" : "var(--clay-soft)" }}>
                    {t.type === "income" ? <ArrowUpRight size={16} className="text-[var(--moss)]" /> : <ArrowDownRight size={16} className="text-[var(--clay)]" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{t.subtitle} · {t.time}</div>
                  </div>
                  <div className="text-sm font-mono" style={{ color: t.type === "income" ? "var(--moss)" : "var(--clay)" }}>
                    {t.type === "income" ? "+" : "−"}{t.amount.toLocaleString("ru-RU")} ₽
                  </div>
                </Wrapper>
              );
            })}
          </div>
        </div>

        <BottomNav />

        <button aria-label="Добавить операцию" className="fixed rounded-full flex items-center justify-center shadow-lg"
          style={{ background: "var(--clay)", color: "#FBF9F3", width: 44, height: 44, bottom: 88, right: "calc(50% - 176px)" }}>
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
