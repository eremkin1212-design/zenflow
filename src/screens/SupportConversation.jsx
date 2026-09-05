import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Send, CheckCircle2, Clock3, CircleDot, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../auth";
import {
  getSupportMessages,
  getSupportRequest,
  isSupportAgent,
  resolveOwnSupportRequest,
  sendCustomerReply,
  sendSupportReply,
  subscribeSupportConversation,
  updateSupportStatus,
} from "../data/support";

const STATUS = {
  new: { label: "Новое", Icon: CircleDot },
  in_progress: { label: "В работе", Icon: Clock3 },
  resolved: { label: "Решено", Icon: CheckCircle2 },
};

export default function SupportConversation() {
  const { id } = useParams();
  const requestId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const adminMode = location.pathname.startsWith("/support-admin/");
  const [request, setRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(!adminMode);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [resolutionBusy, setResolutionBusy] = useState(false);
  const endRef = useRef(null);

  const statusMeta = useMemo(() => STATUS[request?.status] || STATUS.new, [request?.status]);
  const lastMessage = messages.length ? messages[messages.length - 1] : null;
  const showResolutionPrompt = !adminMode && request?.status !== "resolved" && lastMessage?.sender_type === "support";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (adminMode) {
          const agent = await isSupportAgent(user?.id);
          if (!agent) {
            if (!cancelled) setAllowed(false);
            return;
          }
          if (!cancelled) setAllowed(true);
        }
        const [req, msgs] = await Promise.all([
          getSupportRequest(requestId),
          getSupportMessages(requestId),
        ]);
        if (!cancelled) {
          setRequest(req);
          setMessages(msgs);
        }
      } catch {
        if (!cancelled) setRequest(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [requestId, adminMode, user?.id]);

  useEffect(() => {
    if (!allowed || !requestId) return;
    return subscribeSupportConversation(requestId, {
      onMessage: (message) => {
        setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev, message]);
      },
      onRequest: (next) => setRequest((prev) => ({ ...(prev || {}), ...next })),
    });
  }, [requestId, allowed]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, showResolutionPrompt, request?.status]);

  async function handleSend(e) {
    e.preventDefault();
    if (!user || !draft.trim() || sending) return;
    const reopening = !adminMode && request?.status === "resolved";
    setSending(true);
    try {
      const created = adminMode
        ? await sendSupportReply({ requestId, userId: user.id, message: draft })
        : await sendCustomerReply({ requestId, userId: user.id, message: draft });
      setMessages((prev) => prev.some((m) => m.id === created.id) ? prev : [...prev, created]);
      if (reopening) {
        setRequest((prev) => prev ? { ...prev, status: "in_progress", updated_at: new Date().toISOString() } : prev);
      }
      setDraft("");
    } catch {
      window.alert("Не удалось отправить сообщение. Проверь подключение и попробуй снова.");
    } finally {
      setSending(false);
    }
  }

  async function handleResolution(resolved) {
    if (!user || resolutionBusy) return;
    setResolutionBusy(true);
    try {
      if (resolved) {
        const updated = await resolveOwnSupportRequest(requestId);
        setRequest(updated);
      } else {
        const created = await sendCustomerReply({
          requestId,
          userId: user.id,
          message: "Нет, вопрос ещё не решён.",
        });
        setMessages((prev) => prev.some((m) => m.id === created.id) ? prev : [...prev, created]);
      }
    } catch {
      window.alert("Не удалось обновить обращение. Попробуй ещё раз.");
    } finally {
      setResolutionBusy(false);
    }
  }

  async function setStatus(status) {
    try {
      setRequest(await updateSupportStatus(requestId, status));
    } catch {
      window.alert("Не удалось изменить статус обращения.");
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center text-sm text-[var(--ink-soft)]">Загрузка…</div>;
  }

  if (!allowed) {
    return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center px-6"><div className="max-w-sm text-center"><div className="text-xl font-serif">Нет доступа</div><button onClick={() => navigate("/support")} className="mt-4 rounded-full px-5 py-3 bg-[var(--moss)] text-[var(--on-accent)] text-sm">Вернуться</button></div></div>;
  }

  if (!request) {
    return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center px-6"><div className="max-w-sm text-center"><div className="text-xl font-serif">Обращение не найдено</div><button onClick={() => navigate(adminMode ? "/support-admin" : "/support")} className="mt-4 rounded-full px-5 py-3 bg-[var(--moss)] text-[var(--on-accent)] text-sm">Назад</button></div></div>;
  }

  const StatusIcon = statusMeta.Icon;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto pb-28">
        <div className="sticky top-0 z-20 px-5 pt-7 pb-3 bg-[var(--paper)]/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(adminMode ? "/support-admin" : "/support")} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--line)]" aria-label="Назад"><ChevronLeft size={18} /></button>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-serif truncate">{request.topic}</div>
              <div className="text-[11px] mt-0.5 flex items-center gap-1 text-[var(--ink-soft)]"><StatusIcon size={12} />{statusMeta.label}{adminMode && request.requester_email ? ` · ${request.requester_email}` : ""}</div>
            </div>
            {adminMode && <ShieldCheck size={20} className="text-[var(--moss)]" />}
          </div>

          {adminMode && (
            <div className="flex gap-2 mt-3">
              {[["new", "Новое"], ["in_progress", "В работе"], ["resolved", "Решено"]].map(([value, label]) => (
                <button key={value} onClick={() => setStatus(value)} className="flex-1 rounded-full py-2 text-[11px] font-medium border border-[var(--line)]" style={{ background: request.status === value ? "var(--moss)" : "var(--surface)", color: request.status === value ? "var(--on-accent)" : "var(--ink-soft)" }}>{label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pt-2 pb-4 flex flex-col gap-3">
          {messages.map((item) => {
            const fromSupport = item.sender_type === "support";
            return (
              <div key={item.id} className={`flex ${fromSupport ? "justify-start" : "justify-end"}`}>
                <div className="max-w-[82%]">
                  <div className="text-[10px] mb-1 px-1 text-[var(--ink-soft)]">{fromSupport ? "Поддержка RITENA" : adminMode ? "Пользователь" : "Вы"}</div>
                  <div className="rounded-2xl px-3.5 py-3 text-sm leading-5 border border-[var(--line)]" style={{ background: fromSupport ? "var(--surface)" : "var(--moss)", color: fromSupport ? "var(--ink)" : "var(--on-accent)", borderBottomLeftRadius: fromSupport ? 6 : undefined, borderBottomRightRadius: fromSupport ? undefined : 6 }}>
                    {item.message}
                  </div>
                  <div className={`text-[9px] mt-1 px-1 text-[var(--ink-soft)] ${fromSupport ? "text-left" : "text-right"}`}>{new Date(item.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            );
          })}

          {showResolutionPrompt && (
            <div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
              <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 size={17} className="text-[var(--moss)]" />Вопрос решён?</div>
              <div className="text-xs mt-1.5 leading-5 text-[var(--ink-soft)]">Если всё получилось, нажми «Да». Если ничего не выбрать и не ответить, обращение автоматически перейдёт в «Решено» примерно через 10 минут после ответа поддержки.</div>
              <div className="flex gap-2 mt-3">
                <button type="button" disabled={resolutionBusy} onClick={() => handleResolution(true)} className="flex-1 rounded-full py-2.5 text-xs font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: resolutionBusy ? 0.55 : 1 }}>Да, всё решено</button>
                <button type="button" disabled={resolutionBusy} onClick={() => handleResolution(false)} className="flex-1 rounded-full py-2.5 text-xs font-medium border border-[var(--line)] bg-[var(--surface-alt)] text-[var(--ink)]" style={{ opacity: resolutionBusy ? 0.55 : 1 }}>Нет</button>
              </div>
            </div>
          )}

          {!adminMode && request.status === "resolved" && (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}>
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <div><div className="text-sm font-medium">Обращение завершено</div><div className="text-xs mt-1 leading-5 opacity-80">Если нужно продолжить этот вопрос, просто напиши сообщение ниже — обращение автоматически вернётся в работу.</div></div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="fixed left-0 right-0 bottom-[72px] z-30 max-w-sm mx-auto px-4 py-3 bg-[var(--paper)]/95 backdrop-blur border-t border-[var(--line)]">
          <div className="flex items-end gap-2 rounded-2xl p-2 bg-[var(--surface)] border border-[var(--line)]">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} maxLength={4000} placeholder={adminMode ? "Ответить пользователю…" : request.status === "resolved" ? "Продолжить диалог…" : "Ответить поддержке…"} className="flex-1 max-h-28 resize-none bg-transparent outline-none text-sm px-2 py-2" />
            <button type="submit" disabled={!draft.trim() || sending} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: !draft.trim() || sending ? 0.45 : 1 }} aria-label="Отправить"><Send size={16} /></button>
          </div>
        </form>

        <BottomNav />
      </div>
    </div>
  );
}
