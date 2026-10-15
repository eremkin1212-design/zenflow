import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Gift, Plus, X, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import {
  cancelCertificate,
  certificateDisplayStatus,
  createCertificate,
  getCertificateRedemptions,
  getCertificates,
} from "../data/certificates";
import { getClients } from "../data/clients";
import { getServices } from "../data/services";

const TYPES = [
  ["amount", "На сумму"],
  ["service", "На услугу"],
  ["sessions", "Абонемент"],
];

function money(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

function statusLabel(certificate) {
  const status = certificateDisplayStatus(certificate);
  if (status === "used") return "Использован";
  if (status === "expired") return "Истёк";
  if (status === "cancelled") return "Отменён";
  return "Активен";
}

function statusTone(certificate) {
  const status = certificateDisplayStatus(certificate);
  if (status === "active") return { bg: "var(--moss-soft)", color: "var(--moss)" };
  if (status === "expired" || status === "cancelled") return { bg: "var(--clay-soft)", color: "var(--clay)" };
  return { bg: "var(--surface-alt)", color: "var(--ink-soft)" };
}

function balanceText(certificate) {
  if (certificate.kind === "amount") {
    return `${money(certificate.remaining_amount)} ₽ из ${money(certificate.initial_amount)} ₽`;
  }
  const one = certificate.remaining_sessions === 1 ? "сеанс" : certificate.remaining_sessions >= 2 && certificate.remaining_sessions <= 4 ? "сеанса" : "сеансов";
  return `${certificate.remaining_sessions} ${one} из ${certificate.initial_sessions}`;
}

export default function Certificates() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState("loading");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [draft, setDraft] = useState({
    kind: "amount",
    clientId: "",
    serviceId: "",
    amount: "",
    sessions: "5",
    salePrice: "",
    expiresAt: "",
    note: "",
  });

  useEffect(() => {
    let dead = false;
    Promise.all([getCertificates(), getClients(), getServices()])
      .then(([certs, cls, svs]) => {
        if (dead) return;
        setCertificates(certs);
        setClients(cls);
        setServices(svs);
        setStatus("ready");
      })
      .catch(() => {
        if (!dead) setStatus("error");
      });
    return () => { dead = true; };
  }, []);

  const activeCount = useMemo(
    () => certificates.filter((c) => certificateDisplayStatus(c) === "active").length,
    [certificates]
  );

  function resetDraft() {
    setDraft({ kind: "amount", clientId: "", serviceId: "", amount: "", sessions: "5", salePrice: "", expiresAt: "", note: "" });
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const created = await createCertificate({
        kind: draft.kind,
        clientId: draft.clientId ? Number(draft.clientId) : null,
        serviceId: draft.serviceId ? Number(draft.serviceId) : null,
        amount: draft.amount,
        sessions: draft.sessions,
        salePrice: draft.salePrice,
        expiresAt: draft.expiresAt,
        note: draft.note,
      });
      setCertificates((prev) => [created, ...prev]);
      resetDraft();
      setShowCreate(false);
    } catch (error) {
      window.alert(error?.message || "Не удалось создать сертификат");
    } finally {
      setSaving(false);
    }
  }

  async function openDetails(certificate) {
    setSelected(certificate);
    setHistory([]);
    setHistoryLoading(true);
    try {
      setHistory(await getCertificateRedemptions(certificate.id));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleCancel(certificate) {
    if (!window.confirm(`Отменить сертификат ${certificate.number}?`)) return;
    try {
      const updated = await cancelCertificate(certificate.id);
      setCertificates((prev) => prev.map((c) => c.id === certificate.id ? updated : c));
      if (selected?.id === certificate.id) setSelected(updated);
    } catch {
      window.alert("Не удалось отменить сертификат");
    }
  }

  async function copyNumber(number) {
    try {
      await navigator.clipboard.writeText(number);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-center justify-between px-5 pt-7 pb-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 bg-[var(--surface-alt)]" aria-label="Назад">
            <ArrowLeft size={18} />
          </button>
          <div className="text-xl font-serif">Сертификаты</div>
          <ThemeToggle />
        </div>

        <div className="mx-5 rounded-3xl p-4 bg-[var(--moss)]" style={{ color: "var(--on-accent)" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2.5" style={{ background: "rgba(255,255,255,.16)" }}><Gift size={19} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Сертификаты и абонементы</div>
              <div className="text-xs opacity-80 mt-0.5">Активных: {activeCount}</div>
            </div>
          </div>
        </div>

        <div className="mx-5 mt-4">
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)} className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium border border-dashed border-[var(--line)] bg-[var(--surface)] text-[var(--moss)]">
              <Plus size={16} /> Выпустить сертификат
            </button>
          ) : (
            <div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
              <div className="flex items-center justify-between">
                <div className="text-base font-serif">Новый сертификат</div>
                <button onClick={() => { setShowCreate(false); resetDraft(); }} className="rounded-full p-1.5 bg-[var(--surface-alt)]"><X size={14} /></button>
              </div>

              <div className="grid grid-cols-3 gap-1 mt-4 p-1 rounded-full bg-[var(--surface-alt)]">
                {TYPES.map(([key, label]) => (
                  <button key={key} onClick={() => setDraft((d) => ({ ...d, kind: key, serviceId: key === "amount" ? "" : d.serviceId, salePrice: key === "amount" ? "" : d.salePrice }))} className="rounded-full py-2 text-[11px] font-medium" style={{ background: draft.kind === key ? "var(--moss)" : "transparent", color: draft.kind === key ? "var(--on-accent)" : "var(--ink-soft)" }}>
                    {label}
                  </button>
                ))}
              </div>

              {draft.kind === "amount" ? (
                <label className="block mt-3 text-xs text-[var(--ink-soft)]">
                  Номинал, ₽
                  <input value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value.replace(/[^0-9]/g, "") }))} inputMode="numeric" placeholder="5000" className="mt-1 w-full rounded-xl p-3 text-base font-mono bg-[var(--surface-alt)] outline-none" />
                </label>
              ) : (
                <>
                  <label className="block mt-3 text-xs text-[var(--ink-soft)]">
                    Услуга
                    <select value={draft.serviceId} onChange={(e) => {
                      const value=e.target.value;
                      const service=services.find((s)=>String(s.id)===String(value));
                      const count=draft.kind==="sessions"?Math.max(1,Number(draft.sessions)||1):1;
                      setDraft((d)=>({...d,serviceId:value,salePrice:service?String(Number(service.price||0)*count):""}));
                    }} className="mt-1 w-full rounded-xl p-3 text-sm bg-[var(--surface-alt)] outline-none">
                      <option value="">Выберите услугу</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {money(s.price)} ₽</option>)}
                    </select>
                  </label>
                  {draft.kind === "sessions" && (
                    <label className="block mt-3 text-xs text-[var(--ink-soft)]">
                      Количество сеансов
                      <input value={draft.sessions} onChange={(e) => {
                        const clean=e.target.value.replace(/[^0-9]/g,"");
                        const service=services.find((s)=>String(s.id)===String(draft.serviceId));
                        setDraft((d)=>({...d,sessions:clean,salePrice:service?String(Number(service.price||0)*Math.max(1,Number(clean)||1)):d.salePrice}));
                      }} inputMode="numeric" placeholder="5" className="mt-1 w-full rounded-xl p-3 text-base font-mono bg-[var(--surface-alt)] outline-none" />
                    </label>
                  )}
                  <label className="block mt-3 text-xs text-[var(--ink-soft)]">
                    Стоимость {draft.kind === "sessions" ? "абонемента" : "сертификата"}, ₽
                    <input value={draft.salePrice} onChange={(e) => setDraft((d) => ({ ...d, salePrice: e.target.value.replace(/[^0-9]/g, "") }))} inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-xl p-3 text-base font-mono bg-[var(--surface-alt)] outline-none" />
                    <span className="block mt-1 text-[10px]">Это цена продажи. При использовании списывается сеанс, а не эта сумма.</span>
                  </label>
                </>
              )}

              <label className="block mt-3 text-xs text-[var(--ink-soft)]">
                Клиент
                <select value={draft.clientId} onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value }))} className="mt-1 w-full rounded-xl p-3 text-sm bg-[var(--surface-alt)] outline-none">
                  <option value="">Без привязки · предъявителю</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>

              <label className="block mt-3 text-xs text-[var(--ink-soft)]">
                Действует до
                <input type="date" value={draft.expiresAt} onChange={(e) => setDraft((d) => ({ ...d, expiresAt: e.target.value }))} className="mt-1 w-full rounded-xl p-3 text-sm bg-[var(--surface-alt)] outline-none" />
              </label>

              <label className="block mt-3 text-xs text-[var(--ink-soft)]">
                Комментарий
                <textarea value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} placeholder="Например: подарок на день рождения" rows={2} className="mt-1 w-full rounded-xl p-3 text-sm bg-[var(--surface-alt)] outline-none resize-none" />
              </label>

              <button onClick={handleCreate} disabled={saving} className="w-full mt-4 rounded-full py-3 text-sm font-medium bg-[var(--moss)] text-[var(--on-accent)]" style={{ opacity: saving ? .6 : 1 }}>
                {saving ? "Создаём…" : "Создать сертификат"}
              </button>
            </div>
          )}
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Все сертификаты</div>
          {status === "loading" && <div className="py-8 text-center text-sm text-[var(--ink-soft)]">Загружаем…</div>}
          {status === "error" && <div className="py-8 text-center text-sm text-[var(--clay)]">Не удалось загрузить сертификаты</div>}
          {status === "ready" && !certificates.length && <div className="py-8 text-center text-sm text-[var(--ink-soft)]">Сертификатов пока нет</div>}
          <div className="flex flex-col gap-2.5">
            {certificates.map((certificate) => {
              const tone = statusTone(certificate);
              return (
                <button key={certificate.id} onClick={() => openDetails(certificate)} className="w-full text-left rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm font-medium">{certificate.number}</div>
                      <div className="text-xs mt-1 text-[var(--ink-soft)]">
                        {certificate.kind === "amount" ? "Сертификат на сумму" : certificate.kind === "service" ? "Сертификат на услугу" : "Абонемент"}
                      </div>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: tone.bg, color: tone.color }}>{statusLabel(certificate)}</span>
                  </div>
                  <div className="mt-3 text-lg font-mono">{balanceText(certificate)}</div>
                  {certificate.services?.name && <div className="text-xs mt-1 text-[var(--ink-soft)]">{certificate.services.name}</div>}
                  {certificate.sale_price > 0 && <div className="text-xs mt-1 text-[var(--ink-soft)]">Стоимость при выпуске: {money(certificate.sale_price)} ₽</div>}
                  {certificate.clients?.name && <div className="text-xs mt-1 text-[var(--ink-soft)]">Клиент: {certificate.clients.name}</div>}
                  {certificate.expires_at && <div className="text-[11px] mt-2 text-[var(--ink-soft)]">До {new Date(`${certificate.expires_at}T12:00:00`).toLocaleDateString("ru-RU")}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {selected && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelected(null)} />
            <div className="fixed left-0 right-0 bottom-0 max-w-sm mx-auto z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl p-5 pb-8 bg-[var(--surface)]">
              <div className="mx-auto w-9 h-1 rounded-full bg-[var(--line)] mb-4" />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-serif">{selected.number}</div>
                  <div className="text-sm mt-1 text-[var(--ink-soft)]">{balanceText(selected)}</div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-full p-2 bg-[var(--surface-alt)]"><X size={15} /></button>
              </div>

              <button onClick={() => copyNumber(selected.number)} className="mt-3 rounded-full px-3 py-2 text-xs flex items-center gap-1.5 bg-[var(--surface-alt)]">
                <Copy size={13} /> Скопировать номер
              </button>

              {selected.services?.name && <div className="mt-3 text-sm">Услуга: <b>{selected.services.name}</b></div>}
              {selected.sale_price > 0 && <div className="mt-1 text-sm">Стоимость при выпуске: <b>{money(selected.sale_price)} ₽</b></div>}
              {selected.clients?.name && <div className="mt-1 text-sm">Клиент: <b>{selected.clients.name}</b></div>}
              {selected.note && <div className="mt-3 rounded-xl p-3 text-sm bg-[var(--surface-alt)]">{selected.note}</div>}

              <div className="mt-5 text-sm font-medium">История использования</div>
              {historyLoading && <div className="py-4 text-sm text-[var(--ink-soft)]">Загружаем…</div>}
              {!historyLoading && !history.length && <div className="py-4 text-sm text-[var(--ink-soft)]">Пока не использовался</div>}
              <div className="mt-2 flex flex-col gap-2">
                {history.map((item) => (
                  <div key={item.id} className="rounded-xl p-3 bg-[var(--surface-alt)]">
                    <div className="flex justify-between gap-2 text-sm">
                      <span>{item.appointments?.clients?.name || "Клиент"}</span>
                      <span className="font-mono">{item.sessions_used ? "1 сеанс" : `${money(item.amount_used)} ₽`}</span>
                    </div>
                    <div className="text-[11px] mt-1 text-[var(--ink-soft)]">
                      {item.appointments?.date ? new Date(`${item.appointments.date}T12:00:00`).toLocaleDateString("ru-RU") : ""}
                      {item.appointments?.services?.name ? ` · ${item.appointments.services.name}` : ""}
                      {item.topup_amount > 0 ? ` · доплата ${money(item.topup_amount)} ₽ (${item.topup_method})` : ""}
                    </div>
                  </div>
                ))}
              </div>

              {certificateDisplayStatus(selected) === "active" && (
                <button onClick={() => handleCancel(selected)} className="w-full mt-5 rounded-full py-3 text-sm flex items-center justify-center gap-2 bg-[var(--clay-soft)] text-[var(--clay)]">
                  <Ban size={14} /> Отменить сертификат
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
