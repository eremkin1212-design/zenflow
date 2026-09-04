import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronDown, Send, LifeBuoy, CheckCircle2, Clock3, CircleDot, ChevronRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../auth";
import { createSupportRequest, getSupportRequests, isSupportAgent } from "../data/support";

const TOPICS = ["Записи", "Клиенты", "Финансы", "Уведомления", "Другое"];

const FAQ = [
  ["Как изменить или отменить запись?", "Откройте запись в календаре и выберите нужное действие. Изменения сразу попадут в карточку клиента и расчёты."],
  ["Почему сумма в финансах отличается от цены услуги?", "В финансах учитывается фактически оплаченная сумма. Полная стоимость услуги сохраняется отдельно."],
  ["Как изменить рабочее время?", "Откройте Настройки → Рабочее время, выберите дату и задайте график. Его можно скопировать на другие даты."],
  ["Можно ли восстановить удалённые данные?", "Напишите в поддержку и укажите, что именно было удалено и примерно когда это произошло."],
];

const STATUS = {
  new: { label: "Новое", Icon: CircleDot },
  in_progress: { label: "В работе", Icon: Clock3 },
  resolved: { label: "Решено", Icon: CheckCircle2 },
};

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [agent, setAgent] = useState(false);

  async function loadRequests() {
    try {
      setRequests(await getSupportRequests());
    } catch {
      // keep the support screen usable even if history fails to load
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    let cancelled = false;
    isSupportAgent(user?.id).then((value) => { if (!cancelled) setAgent(value); });
    return () => { cancelled = true; };
  }, [user?.id]);

  async function handleSend(e) {
    e.preventDefault();
    if (!user || !message.trim() || sending) return;
    setSending(true);
    setSent(false);
    try {
      const created = await createSupportRequest({ ownerId: user.id, email: user.email, topic, message });
      setRequests((prev) => [created, ...prev]);
      setMessage("");
      setSent(true);
      window.setTimeout(() => setSent(false), 2500);
      navigate(`/support/${created.id}`);
    } catch {
      window.alert("Не удалось отправить обращение. Проверь подключение и попробуй снова.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto pb-28">
        <div className="flex items-center gap-3 px-5 pt-7 pb-4">
          <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--line)]" aria-label="Назад"><ChevronLeft size={18} /></button>
          <div className="flex-1">
            <div className="text-2xl font-serif" style={{ fontWeight: 500 }}>Поддержка</div>
            <div className="text-xs mt-0.5 text-[var(--ink-soft)]">RITENA</div>
          </div>
          {agent && <button onClick={() => navigate("/support-admin")} className="w-10 h-10 rounded-2xl flex items-center justify-center border border-[var(--line)]" style={{ background: "var(--surface)", color: "var(--moss)" }} aria-label="Панель поддержки"><ShieldCheck size={18} /></button>}
        </div>

        {agent && (
          <button onClick={() => navigate("/support-admin")} className="mx-5 mb-4 w-[calc(100%-2.5rem)] rounded-2xl p-3.5 flex items-center justify-between text-left border border-[var(--line)]" style={{ background: "var(--moss-soft)" }}>
            <div><div className="text-sm font-medium" style={{ color: "var(--moss)" }}>Панель поддержки</div><div className="text-xs mt-0.5 text-[var(--ink-soft)]">Посмотреть обращения пользователей и ответить</div></div><ChevronRight size={16} className="text-[var(--moss)]" />
          </button>
        )}

        <div className="mx-5 rounded-3xl p-5 bg-[var(--surface)] border border-[var(--line)]">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}><LifeBuoy size={22} /></div>
          <div className="text-xl font-serif">Чем помочь?</div>
          <div className="text-sm mt-1 text-[var(--ink-soft)]">Напиши вопрос или проблему. После отправки откроется диалог с поддержкой RITENA.</div>

          <form onSubmit={handleSend} className="mt-4">
            <div className="text-xs mb-2 text-[var(--ink-soft)]">Тема</div>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((item) => (
                <button key={item} type="button" onClick={() => setTopic(item)} className="rounded-full px-3 py-2 text-xs font-medium border border-[var(--line)]" style={{ background: topic === item ? "var(--moss)" : "var(--surface-alt)", color: topic === item ? "var(--on-accent)" : "var(--ink-soft)" }}>{item}</button>
              ))}
            </div>

            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000} placeholder="Опиши, что произошло или что хотелось бы улучшить…" className="mt-3 w-full resize-none rounded-2xl p-3.5 text-sm bg-[var(--surface-alt)] border border-[var(--line)] outline-none" />
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-[var(--ink-soft)]"><span>Не отправляй пароли и коды</span><span>{message.length}/2000</span></div>

            <button type="submit" disabled={!message.trim() || sending} className="mt-3 w-full rounded-full py-3.5 text-sm font-medium flex items-center justify-center gap-2" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: !message.trim() || sending ? 0.5 : 1 }}><Send size={15} />{sending ? "Отправляем…" : "Написать в поддержку"}</button>
            {sent && <div className="mt-3 rounded-2xl p-3 text-sm flex items-center gap-2" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}><CheckCircle2 size={16} />Обращение отправлено</div>}
          </form>
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Ваши обращения</div>
          <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
            {loading ? <div className="py-5 text-sm text-center text-[var(--ink-soft)]">Загружаем…</div> : requests.length === 0 ? <div className="py-5 text-sm text-center text-[var(--ink-soft)]">Обращений пока нет</div> : requests.map((item, i) => {
              const meta = STATUS[item.status] || STATUS.new;
              const Icon = meta.Icon;
              return (
                <button key={item.id} onClick={() => navigate(`/support/${item.id}`)} className="w-full py-3.5 text-left flex items-center gap-3" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--surface-alt)]" style={{ color: "var(--moss)" }}><Icon size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><div className="text-sm font-medium truncate">{item.topic}</div><div className="text-[10px] shrink-0 text-[var(--ink-soft)]">{meta.label}</div></div>
                    <div className="text-xs mt-1 line-clamp-1 text-[var(--ink-soft)]">{item.message}</div>
                    <div className="text-[10px] mt-1.5 text-[var(--ink-soft)]">Последняя активность: {new Date(item.last_message_at || item.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-[var(--ink-soft)]" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Частые вопросы</div>
          <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
            {FAQ.map(([q, a], i) => (
              <div key={q} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full py-3.5 flex items-center justify-between gap-3 text-left"><span className="text-sm">{q}</span><ChevronDown size={16} className="shrink-0 text-[var(--ink-soft)] transition-transform" style={{ transform: openFaq === i ? "rotate(180deg)" : "none" }} /></button>
                {openFaq === i && <div className="text-xs leading-5 pb-3.5 text-[var(--ink-soft)]">{a}</div>}
              </div>
            ))}
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
