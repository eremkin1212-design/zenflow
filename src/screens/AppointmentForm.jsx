import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Plus, Minus, Repeat, X, Check } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { getServices } from "../data/services";
import { getClients } from "../data/clients";
import { getAppointmentById, createAppointment, updateAppointment, completeAppointment, fmtDate } from "../data/appointments";

const REPEATS = ["Не повторять", "Каждую неделю", "Каждые 2 недели", "Каждый месяц"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function startOfWeek(d) {
  const day = (d.getDay() + 6) % 7;
  const s = new Date(d); s.setDate(d.getDate() - day); s.setHours(0, 0, 0, 0);
  return s;
}
function pad(n) { return n.toString().padStart(2, "0"); }
function minutesToTime(m) { return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }

export default function AppointmentForm() {
  const { mode: routeParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = routeParam === "new";
  const appointmentId = isNew ? null : routeParam;
  const preselectClientId = searchParams.get("client");

  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loadStatus, setLoadStatus] = useState("loading"); // loading | ready | error

  const [client, setClient] = useState(null); // { id, name }
  const [service, setService] = useState(null); // id
  const [dayIdx, setDayIdx] = useState((new Date().getDay() + 6) % 7);
  const [timeMin, setTimeMin] = useState(10 * 60);
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(0);
  const [repeat, setRepeat] = useState("Не повторять");
  const [notes, setNotes] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const monday = startOfWeek(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getServices(),
      getClients(),
      appointmentId ? getAppointmentById(appointmentId) : Promise.resolve(null),
    ])
      .then(([svcs, cls, appt]) => {
        if (cancelled) return;
        setServices(svcs);
        setClients(cls);

        if (appt) {
          setClient(appt.clients ? { id: appt.clients.id, name: appt.clients.name } : null);
          setService(appt.service_id);
          const idx = weekDates.findIndex((d) => fmtDate(d) === appt.date);
          setDayIdx(idx >= 0 ? idx : (new Date().getDay() + 6) % 7);
          const [h, m] = appt.start_time.split(":").map(Number);
          setTimeMin(h * 60 + m);
          setDuration(appt.duration);
          setPrice(appt.price);
          setNotes(appt.notes || "");
        } else if (preselectClientId) {
          const found = cls.find((c) => String(c.id) === preselectClientId);
          if (found) setClient({ id: found.id, name: found.name });
        }
        setLoadStatus("ready");
      })
      .catch(() => { if (!cancelled) setLoadStatus("error"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const filteredClients = clients.filter((c) => c.name.toLowerCase().includes(clientQuery.toLowerCase()));

  function pickService(s) {
    setService(s.id); setDuration(s.duration); setPrice(s.price);
  }

  function buildPayload() {
    return {
      client_id: client?.id || null,
      service_id: service,
      date: fmtDate(weekDates[dayIdx]),
      start_time: minutesToTime(timeMin),
      duration,
      price,
      notes,
    };
  }

  async function handleSave() {
    if (!client) { setError("Выберите клиента"); return; }
    if (!service) { setError("Выберите услугу"); return; }
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await createAppointment({ ...buildPayload(), status: "planned" });
      } else {
        await updateAppointment(appointmentId, buildPayload());
      }
      navigate("/calendar");
    } catch {
      setError("Не удалось сохранить. Проверь подключение и попробуй снова.");
      setSaving(false);
    }
  }

  async function handleCancelAppointment() {
    if (!window.confirm("Отменить эту запись?")) return;
    setSaving(true);
    try {
      await updateAppointment(appointmentId, { status: "cancelled" });
      navigate("/calendar");
    } catch {
      setError("Не удалось отменить. Попробуй снова.");
      setSaving(false);
    }
  }

  const [confirmingComplete, setConfirmingComplete] = useState(false);

  async function handleCompleteWithMethod(method) {
    setSaving(true);
    try {
      await completeAppointment({ id: appointmentId, client_id: client?.id, price }, method);
      navigate("/calendar");
    } catch {
      setError("Не удалось завершить. Попробуй снова.");
      setSaving(false);
    }
  }

  if (loadStatus === "loading") {
    return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans flex items-center justify-center text-sm text-[var(--ink-soft)]">Загружаем…</div>;
  }
  if (loadStatus === "error") {
    return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans flex items-center justify-center text-sm text-[var(--clay)]">Не удалось загрузить данные</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-28">
        <div className="flex items-center justify-between px-5 pt-7 pb-2">
          <button onClick={() => navigate(-1)} aria-label="Назад" className="rounded-full p-2.5 bg-[var(--surface-alt)] border border-[var(--line)]">
            <ArrowLeft size={18} />
          </button>
          <div className="text-lg font-serif" style={{ fontWeight: 500 }}>
            {isNew ? "Новая запись" : "Редактирование записи"}
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-5 mt-5">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Клиент</div>
          {client ? (
            <div className="rounded-2xl p-3.5 flex items-center justify-between bg-[var(--moss-soft)]">
              <div className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center text-sm font-medium" style={{ width: 38, height: 38, background: "var(--surface)", color: "var(--moss)" }}>
                  {client.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <div className="text-sm font-medium">{client.name}</div>
              </div>
              <button onClick={() => setClient(null)} className="text-xs font-medium text-[var(--moss)]">Изменить</button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--line)]">
                <Search size={16} className="text-[var(--ink-soft)]" />
                <input
                  value={clientQuery} onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Поиск клиента" className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              <div className="flex gap-2 mt-2.5 overflow-x-auto">
                {filteredClients.slice(0, 6).map((c) => (
                  <button key={c.id} onClick={() => setClient({ id: c.id, name: c.name })} className="shrink-0 rounded-full px-3.5 py-2 text-sm bg-[var(--surface-alt)] border border-[var(--line)]">
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mx-5 mt-5">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Услуга</div>
          <div className="grid grid-cols-2 gap-2.5">
            {services.map((s) => {
              const active = service === s.id;
              return (
                <button key={s.id} onClick={() => pickService(s)} className="rounded-2xl p-3 text-left border"
                  style={{ background: active ? `${s.color}26` : "var(--surface)", borderColor: active ? s.color : "var(--line)" }}>
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: s.color }} />
                  <div className="text-sm font-medium mt-1.5">{s.name}</div>
                  <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{s.duration} мин · {s.price.toLocaleString("ru-RU")} ₽</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-5 mt-5">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Дата</div>
          <div className="flex justify-between">
            {weekDates.map((d, i) => {
              const active = i === dayIdx;
              return (
                <button key={i} onClick={() => setDayIdx(i)} className="flex flex-col items-center gap-1 rounded-xl py-2 w-9"
                  style={{ background: active ? "var(--moss)" : "transparent", color: active ? "var(--on-accent)" : "var(--ink-soft)" }}>
                  <span className="text-[10px] uppercase opacity-80">{WEEKDAYS[i]}</span>
                  <span className="text-sm font-medium">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mx-5 mt-5">
          <div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
            <div className="text-xs mb-1.5 text-[var(--ink-soft)]">Время</div>
            <input
              type="time"
              value={minutesToTime(timeMin)}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                if (!Number.isNaN(h) && !Number.isNaN(m)) setTimeMin(h * 60 + m);
              }}
              step="60"
              className="w-full bg-transparent outline-none text-base font-mono"
            />
          </div>
          <div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
            <div className="text-xs mb-1.5 text-[var(--ink-soft)]">Длительность</div>
            <div className="flex items-center justify-between">
              <button onClick={() => setDuration((d) => Math.max(15, d - 15))} aria-label="Короче" className="rounded-full p-1.5 bg-[var(--surface-alt)]"><Minus size={14} /></button>
              <span className="text-base font-mono">{duration} мин</span>
              <button onClick={() => setDuration((d) => Math.min(180, d + 15))} aria-label="Длиннее" className="rounded-full p-1.5 bg-[var(--surface-alt)]"><Plus size={14} /></button>
            </div>
          </div>
        </div>

        <div className="mx-5 mt-2.5">
          <div className="rounded-2xl p-3.5 flex items-center justify-between bg-[var(--surface)] border border-[var(--line)]">
            <div className="text-xs text-[var(--ink-soft)]">Стоимость</div>
            <div className="flex items-center gap-1.5">
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} className="bg-transparent outline-none text-base text-right w-20 font-mono" />
              <span className="text-base font-mono">₽</span>
            </div>
          </div>
        </div>

        <div className="mx-5 mt-5">
          <div className="text-sm font-medium mb-2 flex items-center gap-1.5 text-[var(--ink-soft)]"><Repeat size={14} /> Повтор</div>
          <div className="flex gap-2 overflow-x-auto">
            {REPEATS.map((r) => (
              <button key={r} onClick={() => setRepeat(r)} className="shrink-0 rounded-full px-3.5 py-2 text-sm border"
                style={{ background: repeat === r ? "var(--moss)" : "var(--surface-alt)", color: repeat === r ? "var(--on-accent)" : "var(--ink-soft)", borderColor: repeat === r ? "transparent" : "var(--line)" }}>
                {r}
              </button>
            ))}
          </div>
          <div className="text-xs mt-1.5 text-[var(--ink-soft)]">Повтор пока не создаёт копии записи автоматически — этим займёмся дальше.</div>
        </div>

        <div className="mx-5 mt-5">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Заметка к записи</div>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Например: особенности, пожелания клиента…" rows={3}
            className="w-full rounded-2xl p-3.5 text-sm bg-[var(--surface)] border border-[var(--line)] outline-none resize-none"
          />
        </div>

        {error && <div className="mx-5 mt-4 text-sm text-[var(--danger)]">{error}</div>}

        <div className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto px-5 py-3 bg-[var(--paper)] border-t border-[var(--line)]">
          {!isNew ? (
            confirmingComplete ? (
              <div className="rounded-2xl p-3 bg-[var(--surface-alt)]">
                <div className="text-xs mb-2 text-[var(--ink-soft)]">Как оплатили?</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCompleteWithMethod("Наличные")} disabled={saving} className="flex-1 rounded-full py-2.5 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
                    Наличные
                  </button>
                  <button onClick={() => handleCompleteWithMethod("Карта")} disabled={saving} className="flex-1 rounded-full py-2.5 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
                    Карта
                  </button>
                  <button onClick={() => setConfirmingComplete(false)} aria-label="Отмена" className="rounded-full p-2.5 bg-[var(--surface)]">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCancelAppointment} disabled={saving} className="rounded-full p-3.5 flex items-center justify-center" style={{ background: "var(--clay-soft)", color: "var(--danger)" }} aria-label="Отменить запись"><X size={18} /></button>
                <button onClick={() => setConfirmingComplete(true)} disabled={saving} className="rounded-full p-3.5 flex items-center justify-center bg-[var(--surface-alt)] border border-[var(--line)]" aria-label="Завершить сессию"><Check size={18} /></button>
                <button onClick={handleSave} disabled={saving} className="flex-1 rounded-full py-3.5 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Сохраняем…" : "Сохранить изменения"}
                </button>
              </div>
            )
          ) : (
            <button onClick={handleSave} disabled={saving} className="w-full rounded-full py-3.5 text-sm font-medium" style={{ background: "var(--clay)", color: "#FBF9F3", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Сохраняем…" : "Сохранить запись"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
