import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, Receipt, X, Pencil, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getAppointmentsRange, fmtDate } from "../data/appointments";
import { getExpensesRange, createExpense, updateExpense, deleteExpense } from "../data/expenses";

const PERIODS = [["day", "День"], ["week", "Неделя"], ["month", "Месяц"]];
const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_LABELS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function startOfWeek(d) {
  const day = (d.getDay() + 6) % 7;
  const s = new Date(d); s.setDate(d.getDate() - day); s.setHours(0, 0, 0, 0);
  return s;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function dateInputValue(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDateTitle(d) {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
function formatWeekTitle(d) {
  const end = new Date(d); end.setDate(d.getDate() + 6);
  const left = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const right = end.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  return `${left} — ${right}`;
}

export default function Finance() {
  const now = new Date();
  const [period, setPeriod] = useState("week");
  const [selectedDay, setSelectedDay] = useState(() => new Date(now));
  const [selectedWeek, setSelectedWeek] = useState(() => startOfWeek(now));
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(now));
  const [appts, setAppts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [status, setStatus] = useState("loading");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: "", subtitle: "", amount: 0 });
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editExpenseDraft, setEditExpenseDraft] = useState({ title: "", subtitle: "", amount: 0 });

  const range = useMemo(() => {
    if (period === "day") return { start: new Date(selectedDay), end: new Date(selectedDay) };
    if (period === "month") return { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) };
    const s = new Date(selectedWeek);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return { start: s, end: e };
  }, [period, selectedDay, selectedWeek, selectedMonth]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([getAppointmentsRange(range.start, range.end), getExpensesRange(range.start, range.end)])
      .then(([a, e]) => { if (!cancelled) { setAppts(a); setExpenses(e); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [range]);

  function shiftDay(delta) {
    setSelectedDay((current) => { const d = new Date(current); d.setDate(d.getDate() + delta); return d; });
  }
  function shiftWeek(delta) {
    setSelectedWeek((current) => { const d = new Date(current); d.setDate(d.getDate() + delta * 7); return d; });
  }
  function shiftMonth(delta) {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }
  function handleDayChange(value) {
    if (!value) return;
    const [y, m, d] = value.split("-").map(Number);
    setSelectedDay(new Date(y, m - 1, d));
  }
  function handleWeekChange(value) {
    if (!value) return;
    const [y, m, d] = value.split("-").map(Number);
    setSelectedWeek(startOfWeek(new Date(y, m - 1, d)));
  }
  function handleMonthChange(value) {
    if (!value) return;
    const [y, m] = value.split("-").map(Number);
    setSelectedMonth(new Date(y, m - 1, 1));
  }
  function formatMonthTitle() {
    return `${MONTH_LABELS[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;
  }

  const doneAppts = appts.filter((a) => a.status === "done");
  const income = doneAppts.reduce((s, a) => s + a.price, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = income - expenseTotal;
  const avgCheck = doneAppts.length ? Math.round(income / doneAppts.length) : 0;

  const chartDays = useMemo(() => {
    const days = [];
    const cursor = new Date(range.start);
    while (cursor <= range.end && days.length < 31) {
      const dStr = fmtDate(cursor);
      const dayIncome = appts.filter((a) => a.status === "done" && a.date === dStr).reduce((s, a) => s + a.price, 0);
      days.push({ label: period === "month" ? String(cursor.getDate()) : WEEKDAY_LABELS[(cursor.getDay() + 6) % 7], income: dayIncome });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [appts, range, period]);
  const maxVal = Math.max(...chartDays.map((d) => d.income), 1);

  const transactions = useMemo(() => {
    const fromAppts = doneAppts.map((a) => ({
      id: `a${a.id}`, type: "income",
      title: a.clients?.name || "Клиент удалён", subtitle: a.services?.name || "",
      amount: a.price, time: a.start_time, clientId: a.clients?.id,
    }));
    const fromExpenses = expenses.map((e) => ({
      id: `e${e.id}`, type: "expense", expenseId: e.id, title: e.title, subtitle: e.subtitle, amount: e.amount, time: "",
    }));
    return [...fromAppts, ...fromExpenses].sort((a, b) => (b.time || "").localeCompare(a.time || ""));
  }, [doneAppts, expenses]);

  async function handleAddExpense() {
    if (!newExpense.title.trim()) return;
    setSavingExpense(true);
    try {
      const created = await createExpense(newExpense);
      setExpenses((prev) => [created, ...prev]);
      setNewExpense({ title: "", subtitle: "", amount: 0 });
      setShowAddExpense(false);
    } catch {
      window.alert("Не удалось сохранить расход. Проверь подключение.");
    } finally {
      setSavingExpense(false);
    }
  }

  function startEditExpense(t) {
    setEditingExpenseId(t.expenseId);
    setEditExpenseDraft({ title: t.title, subtitle: t.subtitle, amount: t.amount });
  }

  async function handleSaveExpenseEdit() {
    setSavingExpense(true);
    try {
      const updated = await updateExpense(editingExpenseId, editExpenseDraft);
      setExpenses((prev) => prev.map((e) => (e.id === editingExpenseId ? updated : e)));
      setEditingExpenseId(null);
    } catch {
      window.alert("Не удалось сохранить изменения. Проверь подключение.");
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteExpense(id, title) {
    if (!window.confirm(`Удалить расход «${title}»?`)) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
      window.alert("Не удалось удалить. Проверь подключение и попробуй снова.");
    }
  }

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

        {period === "day" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-2xl p-2 bg-[var(--surface)] border border-[var(--line)]">
            <button onClick={() => shiftDay(-1)} aria-label="Предыдущий день" className="rounded-full p-2.5 bg-[var(--surface-alt)]"><ChevronLeft size={18} /></button>
            <label className="relative flex-1 text-center cursor-pointer">
              <div className="text-sm font-medium">{formatDateTitle(selectedDay)}</div>
              <input type="date" value={dateInputValue(selectedDay)} onChange={(e) => handleDayChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </label>
            <button onClick={() => shiftDay(1)} aria-label="Следующий день" className="rounded-full p-2.5 bg-[var(--surface-alt)]"><ChevronRight size={18} /></button>
          </div>
        )}

        {period === "week" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-2xl p-2 bg-[var(--surface)] border border-[var(--line)]">
            <button onClick={() => shiftWeek(-1)} aria-label="Предыдущая неделя" className="rounded-full p-2.5 bg-[var(--surface-alt)]"><ChevronLeft size={18} /></button>
            <label className="relative flex-1 text-center cursor-pointer">
              <div className="text-sm font-medium">{formatWeekTitle(selectedWeek)}</div>
              <div className="text-[10px] text-[var(--ink-soft)] mt-0.5">Нажми, чтобы выбрать неделю</div>
              <input type="date" value={dateInputValue(selectedWeek)} onChange={(e) => handleWeekChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </label>
            <button onClick={() => shiftWeek(1)} aria-label="Следующая неделя" className="rounded-full p-2.5 bg-[var(--surface-alt)]"><ChevronRight size={18} /></button>
          </div>
        )}

        {period === "month" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-2xl p-2 bg-[var(--surface)] border border-[var(--line)]">
            <button onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц" className="rounded-full p-2.5 bg-[var(--surface-alt)]"><ChevronLeft size={18} /></button>
            <label className="relative flex-1 text-center cursor-pointer">
              <div className="text-sm font-medium">{formatMonthTitle()}</div>
              <div className="text-[10px] text-[var(--ink-soft)] mt-0.5">Нажми, чтобы выбрать месяц</div>
              <input type="month" value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`} onChange={(e) => handleMonthChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </label>
            <button onClick={() => shiftMonth(1)} aria-label="Следующий месяц" className="rounded-full p-2.5 bg-[var(--surface-alt)]"><ChevronRight size={18} /></button>
          </div>
        )}

        {status === "loading" && <div className="text-sm text-center py-10 text-[var(--ink-soft)]">Считаем…</div>}
        {status === "error" && <div className="text-sm text-center py-10 text-[var(--clay)]">Не удалось загрузить данные</div>}

        {status === "ready" && (
          <>
            <div className="grid grid-cols-2 gap-2.5 mx-5 mt-4">
              <div className="rounded-2xl p-3.5" style={{ background: "var(--moss)", color: "var(--on-accent)" }}><ArrowUpRight size={16} /><div className="mt-2 text-lg font-medium font-mono">{income.toLocaleString("ru-RU")} ₽</div><div className="text-[11px] mt-0.5 opacity-85">доход</div></div>
              <div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]"><ArrowDownRight size={16} className="text-[var(--clay)]" /><div className="mt-2 text-lg font-medium font-mono">{expenseTotal.toLocaleString("ru-RU")} ₽</div><div className="text-[11px] mt-0.5 text-[var(--ink-soft)]">расход</div></div>
              <div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]"><Wallet size={16} className="text-[var(--moss)]" /><div className="mt-2 text-lg font-medium font-mono">{profit.toLocaleString("ru-RU")} ₽</div><div className="text-[11px] mt-0.5 text-[var(--ink-soft)]">прибыль</div></div>
              <div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]"><Receipt size={16} className="text-[var(--clay)]" /><div className="mt-2 text-lg font-medium font-mono">{avgCheck.toLocaleString("ru-RU")} ₽</div><div className="text-[11px] mt-0.5 text-[var(--ink-soft)]">средний чек</div></div>
            </div>

            <div className="mx-5 mt-5 rounded-3xl p-4 bg-[var(--surface)] border border-[var(--line)]">
              <div className="text-sm font-medium mb-4 text-[var(--ink-soft)]">Доход по дням</div>
              <div className="flex items-end justify-between gap-1.5 overflow-x-auto" style={{ height: 110 }}>
                {chartDays.map((d, i) => <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-[18px]"><div className="w-full rounded-lg" style={{ height: Math.max((d.income / maxVal) * 90, 4), background: "var(--moss)", opacity: 0.4 + (d.income / maxVal) * 0.6 }} /><span className="text-[10px] text-[var(--ink-soft)]">{d.label}</span></div>)}
              </div>
            </div>

            <div className="mx-5 mt-6">
              <div className="flex items-center justify-between mb-2.5"><div className="text-sm font-medium text-[var(--ink-soft)]">Операции</div><button onClick={() => setShowAddExpense((v) => !v)} className="text-sm font-medium text-[var(--moss)] flex items-center gap-1">{showAddExpense ? <><X size={14} /> Закрыть</> : <><Plus size={14} /> Расход</>}</button></div>
              {showAddExpense && <div className="rounded-2xl p-3.5 flex flex-col gap-2.5 bg-[var(--surface)] border border-[var(--line)] mb-2.5"><input value={newExpense.title} onChange={(e) => setNewExpense((s) => ({ ...s, title: e.target.value }))} placeholder="Название расхода" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" /><input value={newExpense.subtitle} onChange={(e) => setNewExpense((s) => ({ ...s, subtitle: e.target.value }))} placeholder="Комментарий (необязательно)" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" /><input type="number" value={newExpense.amount} onChange={(e) => setNewExpense((s) => ({ ...s, amount: Number(e.target.value) || 0 }))} placeholder="Сумма ₽" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" /><button onClick={handleAddExpense} disabled={savingExpense} className="rounded-full py-2.5 text-sm font-medium" style={{ background: "var(--clay)", color: "#FBF9F3", opacity: savingExpense ? 0.6 : 1 }}>{savingExpense ? "Сохраняем…" : "Сохранить расход"}</button></div>}

              <div className="flex flex-col gap-2.5">
                {transactions.map((t) => {
                  if (t.type === "expense" && editingExpenseId === t.expenseId) return <div key={t.id} className="rounded-2xl p-3.5 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--line)]"><input value={editExpenseDraft.title} onChange={(e) => setEditExpenseDraft((d) => ({ ...d, title: e.target.value }))} className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" /><input value={editExpenseDraft.subtitle} onChange={(e) => setEditExpenseDraft((d) => ({ ...d, subtitle: e.target.value }))} placeholder="Комментарий" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" /><input type="number" value={editExpenseDraft.amount} onChange={(e) => setEditExpenseDraft((d) => ({ ...d, amount: Number(e.target.value) || 0 }))} className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" /><div className="flex gap-2"><button onClick={() => setEditingExpenseId(null)} className="flex-1 rounded-full py-2 text-sm font-medium bg-[var(--surface-alt)]">Отмена</button><button onClick={handleSaveExpenseEdit} disabled={savingExpense} className="flex-1 rounded-full py-2 text-sm font-medium flex items-center justify-center gap-1" style={{ background: "var(--moss)", color: "var(--on-accent)" }}><Check size={14} /> {savingExpense ? "Сохраняем…" : "Сохранить"}</button></div></div>;
                  const Wrapper = t.clientId ? Link : "div";
                  const props = t.clientId ? { to: `/clients/${t.clientId}` } : {};
                  return <Wrapper key={t.id} {...props} className="rounded-2xl p-3.5 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]"><div className="rounded-full p-2" style={{ background: t.type === "income" ? "var(--moss-soft)" : "var(--clay-soft)" }}>{t.type === "income" ? <ArrowUpRight size={16} className="text-[var(--moss)]" /> : <ArrowDownRight size={16} className="text-[var(--clay)]" />}</div><div className="flex-1"><div className="text-sm font-medium">{t.title}</div><div className="text-xs mt-0.5 text-[var(--ink-soft)]">{t.subtitle}{t.time ? ` · ${t.time}` : ""}</div></div><div className="text-sm font-mono" style={{ color: t.type === "income" ? "var(--moss)" : "var(--clay)" }}>{t.type === "income" ? "+" : "−"}{t.amount.toLocaleString("ru-RU")} ₽</div>{t.type === "expense" && <div className="flex items-center gap-1 ml-1"><button onClick={() => startEditExpense(t)} aria-label={`Изменить ${t.title}`} className="p-1"><Pencil size={14} className="text-[var(--moss)]" /></button><button onClick={() => handleDeleteExpense(t.expenseId, t.title)} aria-label={`Удалить ${t.title}`} className="p-1"><Trash2 size={14} className="text-[var(--danger)]" /></button></div>}</Wrapper>;
                })}
                {transactions.length === 0 && <div className="text-sm text-center py-6 text-[var(--ink-soft)]">За этот период операций нет</div>}
              </div>
            </div>
          </>
        )}
        <BottomNav />
      </div>
    </div>
  );
}