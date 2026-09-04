import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Inbox, Clock3, CheckCircle2, CircleDot, ChevronRight, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../auth";
import { connectSupportTelegram, getAllSupportRequests, getSupportTelegramStatus, isSupportAgent, subscribeSupportInbox } from "../data/support";

const STATUS = {
  new: { label: "Новое", Icon: CircleDot },
  in_progress: { label: "В работе", Icon: Clock3 },
  resolved: { label: "Решено", Icon: CheckCircle2 },
};

export default function SupportAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(null);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [telegramStatus, setTelegramStatus] = useState({ connected: false });
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramInfo, setTelegramInfo] = useState("");

  async function load() {
    try {
      setRequests(await getAllSupportRequests());
    } catch {
      // access errors are handled by the agent check
    } finally {
      setLoading(false);
    }
  }

  async function loadTelegramStatus() {
    try {
      setTelegramStatus(await getSupportTelegramStatus());
    } catch {
      setTelegramStatus({ connected: false });
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const agent = await isSupportAgent(user?.id);
      if (cancelled) return;
      setAllowed(agent);
      if (agent) await Promise.all([load(), loadTelegramStatus()]);
      else setLoading(false);
    }
    void boot();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!allowed) return;
    return subscribeSupportInbox(() => { void load(); });
  }, [allowed]);

  const visible = useMemo(() => {
    if (filter === "all") return requests;
    if (filter === "resolved") return requests.filter((r) => r.status === "resolved");
    return requests.filter((r) => r.status !== "resolved");
  }, [requests, filter]);

  const openCount = requests.filter((r) => r.status !== "resolved").length;

  async function handleTelegramConnect() {
    if (!telegramToken.trim() || telegramBusy) return;
    setTelegramBusy(true);
    setTelegramInfo("");
    try {
      const result = await connectSupportTelegram(telegramToken);
      if (result?.connected) {
        setTelegramStatus({ connected: true });
        setTelegramToken("");
        setTelegramInfo("Готово. Тестовое сообщение отправлено в Telegram.");
      } else if (result?.needs_start) {
        setTelegramInfo(`Бот найден${result.bot_username ? `: @${result.bot_username}` : ""}. Открой его в Telegram, нажми Start или отправь /start, затем нажми «Подключить» ещё раз.`);
      } else {
        setTelegramInfo(result?.message || "Не удалось подключить Telegram.");
      }
    } catch (error) {
      setTelegramInfo(error?.message || "Не удалось подключить Telegram.");
    } finally {
      setTelegramBusy(false);
    }
  }

  if (allowed === null || loading) {
    return <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center text-sm text-[var(--ink-soft)]">Загрузка…</div>;
  }

  if (!allowed) {
    return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center px-6"><div className="max-w-sm text-center"><div className="text-xl font-serif">Нет доступа к панели поддержки</div><button onClick={() => navigate("/support")} className="mt-4 rounded-full px-5 py-3 bg-[var(--moss)] text-[var(--on-accent)] text-sm">Вернуться</button></div></div>;
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto pb-28">
        <div className="flex items-center gap-3 px-5 pt-7 pb-4">
          <button onClick={() => navigate("/support")} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--line)]" aria-label="Назад"><ChevronLeft size={18} /></button>
          <div className="flex-1">
            <div className="text-2xl font-serif">Панель поддержки</div>
            <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{openCount ? `Открытых обращений: ${openCount}` : "Новых обращений нет"}</div>
          </div>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "var(--moss-soft)", color: "var(--moss)" }}><Inbox size={19} /></div>
        </div>

        <div className="mx-5 mb-4 rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: telegramStatus.connected ? "var(--moss-soft)" : "var(--surface-alt)", color: "var(--moss)" }}><MessageCircle size={17} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Telegram</div>
              <div className="text-xs text-[var(--ink-soft)]">{telegramStatus.connected ? "Подключён · новые обращения придут в Telegram" : "Уведомления поддержки пока не подключены"}</div>
            </div>
            {telegramStatus.connected && <CheckCircle2 size={17} className="text-[var(--moss)]" />}
          </div>

          {!telegramStatus.connected && (
            <div className="mt-3">
              <div className="text-xs leading-5 text-[var(--ink-soft)]">1. Создай бота через @BotFather. 2. Открой нового бота и нажми Start. 3. Вставь сюда токен из BotFather.</div>
              <div className="flex gap-2 mt-2">
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="Токен Telegram-бота"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm bg-[var(--surface-alt)] border border-[var(--line)] outline-none"
                />
                <button onClick={handleTelegramConnect} disabled={!telegramToken.trim() || telegramBusy} className="rounded-xl px-3 py-2.5 text-xs font-medium bg-[var(--moss)] text-[var(--on-accent)]" style={{ opacity: !telegramToken.trim() || telegramBusy ? 0.5 : 1 }}>{telegramBusy ? "…" : "Подключить"}</button>
              </div>
              {telegramInfo && <div className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">{telegramInfo}</div>}
            </div>
          )}
        </div>

        <div className="mx-5 flex rounded-full p-1 bg-[var(--surface-alt)] border border-[var(--line)]">
          {[["open", "Открытые"], ["resolved", "Решённые"], ["all", "Все"]].map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className="flex-1 rounded-full py-2 text-xs font-medium" style={{ background: filter === value ? "var(--moss)" : "transparent", color: filter === value ? "var(--on-accent)" : "var(--ink-soft)" }}>{label}</button>
          ))}
        </div>

        <div className="mx-5 mt-4 rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
          {visible.length === 0 ? (
            <div className="py-8 text-sm text-center text-[var(--ink-soft)]">Здесь пока пусто</div>
          ) : visible.map((item, i) => {
            const meta = STATUS[item.status] || STATUS.new;
            const Icon = meta.Icon;
            return (
              <button key={item.id} onClick={() => navigate(`/support-admin/${item.id}`)} className="w-full py-3.5 text-left flex items-center gap-3" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: item.status === "new" ? "var(--clay-soft)" : "var(--surface-alt)", color: item.status === "new" ? "var(--clay)" : "var(--moss)" }}><Icon size={16} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><div className="text-sm font-medium truncate">{item.topic}</div><div className="text-[10px] shrink-0 text-[var(--ink-soft)]">{meta.label}</div></div>
                  <div className="text-xs mt-0.5 truncate text-[var(--ink-soft)]">{item.requester_email || `Обращение #${item.id}`}</div>
                  <div className="text-[10px] mt-1 text-[var(--ink-soft)]">{new Date(item.last_message_at || item.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-[var(--ink-soft)]" />
              </button>
            );
          })}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
