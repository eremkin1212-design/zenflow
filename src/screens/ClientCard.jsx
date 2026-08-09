import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, Plus, CalendarCheck, Ban, Wallet, Clock, Image as ImageIcon, Trash2, TrendingUp } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import { getClientById, ratingTag, getHistory, getPayments, getNotes, addNote, getRecommendation, deleteClient } from "../data/clients";

const TABS = [
  { key: "history", label: "История" }, { key: "payments", label: "Оплаты" }, { key: "notes", label: "Заметки" }, { key: "photos", label: "Фото" }, { key: "recs", label: "Рекомендации" },
];

export default function ClientCard() {
  const { id } = useParams(); const navigate = useNavigate();
  const [tab, setTab] = useState("history"); const [status, setStatus] = useState("loading"); const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]); const [payments, setPayments] = useState([]); const [notes, setNotes] = useState([]); const [rec, setRec] = useState("");
  const [newNote, setNewNote] = useState(""); const [savingNote, setSavingNote] = useState(false); const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false; setStatus("loading");
    Promise.all([getClientById(id), getHistory(id), getPayments(id), getNotes(id), getRecommendation(id)]).then(([c, h, p, n, r]) => {
      if (cancelled) return; if (!c) { setStatus("notfound"); return; }
      setClient(c); setHistory(h); setPayments(p); setNotes(n); setRec(r); setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [id]);

  async function handleAddNote() {
    if (!newNote.trim()) return; setSavingNote(true);
    try { const saved = await addNote(id, newNote.trim()); setNotes((prev) => [saved, ...prev]); setNewNote(""); }
    finally { setSavingNote(false); }
  }
  async function handleDelete() {
    if (!window.confirm(`Удалить клиента «${client.name}»? Это действие нельзя отменить.`)) return;
    setDeleting(true); try { await deleteClient(id); navigate("/clients"); } catch { setDeleting(false); window.alert("Не удалось удалить. Проверь подключение и попробуй снова."); }
  }

  if (status === "loading") return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans flex items-center justify-center text-sm text-[var(--ink-soft)]">Загружаем карточку…</div>;
  if (status === "notfound" || status === "error") return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans flex flex-col items-center justify-center gap-3 p-6 text-center"><div className="text-lg font-serif">{status === "notfound" ? "Клиент не найден" : "Не удалось загрузить"}</div><Link to="/clients" className="text-sm font-medium text-[var(--moss)]">← Ко всем клиентам</Link></div>;

  const tag = ratingTag(client); const tagBg = tag.tone === "moss" ? "var(--moss)" : tag.tone === "clay" ? "var(--clay)" : "var(--surface-alt)"; const tagFg = tag.tone === "soft" ? "var(--ink-soft)" : "var(--on-accent)";
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors"><div className="max-w-sm mx-auto relative pb-24">
      <div className="flex items-center justify-between px-5 pt-7 pb-2"><Link to="/clients" aria-label="Назад" className="rounded-full p-2.5 bg-[var(--surface-alt)] border border-[var(--line)]"><ArrowLeft size={18} /></Link><div className="text-sm font-medium text-[var(--ink-soft)]">Карточка клиента</div><div className="flex items-center gap-2"><button onClick={handleDelete} disabled={deleting} aria-label="Удалить клиента" className="rounded-full p-2.5 bg-[var(--surface-alt)] border border-[var(--line)]"><Trash2 size={18} className="text-[var(--danger)]" /></button><ThemeToggle /></div></div>

      <div className="flex flex-col items-center mt-3 px-5"><div className="rounded-full flex items-center justify-center font-serif" style={{ width: 76, height: 76, background: "var(--moss-soft)", color: "var(--moss)", fontSize: 26, fontWeight: 500 }}>{client.initials}</div><div className="mt-3 text-xl font-serif" style={{ fontWeight: 500 }}>{client.name}</div><div className="text-sm mt-0.5 text-[var(--ink-soft)]">{client.phone}</div><div className="mt-2 rounded-full px-3 py-1 text-xs font-medium" style={{ background: tagBg, color: tagFg }}>{tag.label}</div><div className="flex items-center gap-3 mt-4"><button className="rounded-full p-3" style={{ background: "var(--moss)", color: "var(--on-accent)" }} aria-label="Позвонить"><Phone size={17} /></button><button className="rounded-full p-3 bg-[var(--surface-alt)] border border-[var(--line)]" aria-label="Написать"><MessageCircle size={17} /></button><Link to={`/appointment/new?client=${client.id}`} className="rounded-full px-4 py-3 text-sm font-medium flex items-center gap-1.5" style={{ background: "var(--clay)", color: "#FBF9F3" }}><Plus size={15} /> Записать</Link></div></div>

      <div className="grid grid-cols-2 gap-2.5 mx-5 mt-5">
        {[{ Icon: CalendarCheck, value: client.visits, label: "посещений" }, { Icon: Ban, value: client.cancellations, label: "отмен" }, { Icon: Wallet, value: `${client.avg_check.toLocaleString("ru-RU")} ₽`, label: "средний чек" }, { Icon: Clock, value: client.next_visit, label: "следующая запись" }].map(({ Icon, value, label }, i) => <div key={i} className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]"><Icon size={16} className="text-[var(--moss)]" /><div className="mt-2 text-base font-medium font-mono">{value}</div><div className="text-[11px] mt-0.5 text-[var(--ink-soft)]">{label}</div></div>)}
      </div>

      <div className="mx-5 mt-3 rounded-2xl p-4 bg-[var(--moss-soft)]"><div className="flex items-center gap-2 text-xs uppercase text-[var(--ink-soft)]" style={{ letterSpacing: "0.08em" }}><TrendingUp size={14} /> Финансы клиента</div><div className="grid grid-cols-2 gap-3 mt-3"><div><div className="text-lg font-medium font-mono">{client.total_spent.toLocaleString("ru-RU")} ₽</div><div className="text-[11px] text-[var(--ink-soft)]">всего за услуги</div></div><div><div className="text-lg font-medium font-mono">{totalPaid.toLocaleString("ru-RU")} ₽</div><div className="text-[11px] text-[var(--ink-soft)]">оплачено</div></div></div></div>

      <div className="zf-tabs flex gap-2 mx-5 mt-5 overflow-x-auto">{TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className="shrink-0 rounded-full px-4 py-2 text-sm font-medium border" style={{ background: tab === t.key ? "var(--moss)" : "var(--surface-alt)", color: tab === t.key ? "var(--on-accent)" : "var(--ink-soft)", borderColor: tab === t.key ? "transparent" : "var(--line)" }}>{t.label}</button>)}</div>

      <div className="mx-5 mt-4">
        {tab === "history" && <div className="flex flex-col gap-2.5">{history.length === 0 && <div className="text-sm text-center py-6 text-[var(--ink-soft)]">Пока нет посещений</div>}{history.map((h) => <div key={h.id} className="rounded-2xl p-3.5 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: h.color }} /><div className="flex-1"><div className="text-sm font-medium">{h.service}</div><div className="text-xs mt-0.5 text-[var(--ink-soft)]">{h.date}</div></div><div className="text-sm font-mono">{h.price.toLocaleString("ru-RU")} ₽</div></div>)}</div>}
        {tab === "payments" && <div className="flex flex-col gap-2.5">{payments.length > 0 && <div className="rounded-2xl p-3.5 flex items-center justify-between bg-[var(--moss-soft)]"><span className="text-sm text-[var(--ink-soft)]">Всего оплачено</span><span className="text-base font-medium font-mono">{totalPaid.toLocaleString("ru-RU")} ₽</span></div>}{payments.map((p) => <div key={p.id} className="rounded-2xl p-3.5 flex items-center justify-between bg-[var(--surface)] border border-[var(--line)]"><div><div className="text-sm font-medium">{p.method}</div><div className="text-xs mt-0.5 text-[var(--ink-soft)]">{p.date}</div></div><div className="text-sm font-mono">{Number(p.amount || 0).toLocaleString("ru-RU")} ₽</div></div>)}{payments.length === 0 && <div className="text-sm text-center py-6 text-[var(--ink-soft)]">Пока нет оплат</div>}</div>}
        {tab === "notes" && <div className="flex flex-col gap-2.5"><div className="rounded-2xl p-3.5 flex items-center gap-2 border border-[var(--line)] bg-[var(--surface)]"><input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Новая заметка…" className="flex-1 bg-transparent outline-none text-sm" onKeyDown={(e) => e.key === "Enter" && handleAddNote()} /><button onClick={handleAddNote} disabled={savingNote} className="rounded-full p-2" style={{ background: "var(--moss)", color: "var(--on-accent)" }} aria-label="Сохранить заметку"><Plus size={15} /></button></div>{notes.map((n) => <div key={n.id} className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]"><div className="text-sm">{n.text}</div><div className="text-xs mt-1.5 text-[var(--ink-soft)]">{n.date}</div></div>)}{notes.length === 0 && <div className="text-sm text-center py-4 text-[var(--ink-soft)]">Заметок пока нет</div>}</div>}
        {tab === "photos" && <div className="grid grid-cols-3 gap-2.5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="rounded-2xl aspect-square flex items-center justify-center bg-[var(--surface-alt)] border border-[var(--line)]"><ImageIcon size={20} className="text-[var(--ink-soft)]" /></div>)}<button className="rounded-2xl aspect-square flex items-center justify-center border border-dashed border-[var(--line)]" aria-label="Добавить фото"><Plus size={20} className="text-[var(--moss)]" /></button></div>}
        {tab === "recs" && <div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]"><div className="text-sm leading-relaxed">{rec}</div><button className="mt-3 text-sm font-medium text-[var(--moss)]">Изменить рекомендации</button></div>}
      </div>
      <BottomNav />
    </div></div>
  );
}
