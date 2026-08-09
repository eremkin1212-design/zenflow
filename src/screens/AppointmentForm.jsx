import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Plus, Minus, Repeat, X, Check } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { getServices } from "../data/services";

const RECENT_CLIENTS = ["Марина Соколова", "Игорь Плетнёв", "Дарья Ефимова", "Олег Крылов"];
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
  const { mode: routeMode } = useParams();
  const navigate = useNavigate();
  const initialEdit = routeMode !== "new";

  const [services, setServices] = useState([]);
  const [servicesStatus, setServicesStatus] = useState("loading");

  const [mode, setMode] = useState(initialEdit ? "edit" : "new");
  const [client, setClient] = useState(initialEdit ? "Анна Ким" : null);
  const [service, setService] = useState(null);
  const [dayIdx, setDayIdx] = useState((new Date().getDay() + 6) % 7);
  const [timeMin, setTimeMin] = useState(initialEdit ? 13 * 60 : 10 * 60);
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(initialEdit ? 3800 : 0);
  const [repeat, setRepeat] = useState("Не повторять");
  const [notes, setNotes] = useState(initialEdit ? "Просит поменьше давления в области поясницы." : "");

  useEffect(() => {
    let cancelled = false;
    getServices()
      .then((data) => {
        if (cancelled) return;
        setServices(data);
        setServicesStatus("ready");
        // в режиме редактирования выбираем услугу по умолчанию (Лимфодренаж — для демо)
        if (initialEdit) {
          const def = data.find((s) => s.name === "Лимфодренаж") || data[0];
          if (def) setService(def.id);
        }
      })
      .catch(() => { if (!cancelled) setServicesStatus("error"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monday = startOfWeek(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });

  function switchMode(next) {
    setMode(next);
    if (next === "new") {
      setClient(null); setService(null); setTimeMin(10 * 60); setDuration(60); setPrice(0); setNotes(""); setRepeat("Не повторять");
    } else {
      setClient("Анна Ким"); setTimeMin(13 * 60); setDuration(60); setPrice(3800);
      setNotes("Просит поменьше давления в области поясницы."); setRepeat("Не повторять");
      const def = services.find((s) => s.name === "Лимфодренаж") || services[0];
      if (def) setService(def.id);
    }
  }

  function pickService(s) {
    setService(s.id); setDuration(s.duration); setPrice(s.price);
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-28">
        <div className="flex items-center justify-between px-5 pt-7 pb-2">
          <button onClick={() => navigate(-1)} aria-label="Назад" className="rounded-full p-2.5 bg-[var(--surface-alt)] border border-[var(--line)]">
            <ArrowLeft size={18} />
          </button>
          <div className="text-lg font-serif" style={{ fontWeight: 500 }}>
            {mode === "edit" ? "Редактирование записи" : "Новая запись"}
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-5 mt-3 flex rounded-full p-1 bg-[var(--surface-alt)] border border-[var(--line)]">
          {[["new", "Новая"], ["edit", "Редактирование"]].map(([key, label]) => (
            <button key={key} onClick={() => switchMode(key)} className="flex-1 rounded-full py-2 text-sm font-medium"
              style={{ background: mode === key ? "var(--moss)" : "transparent", color: mode === key ? "var(--on-accent)" : "var(--ink-soft)" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="mx-5 mt-5">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Клиент</div>
          {client ? (
            <div className="rounded-2xl p-3.5 flex items-center justify-between bg-[var(--moss-soft)]">
              <div className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center text-sm font-medium" style={{ width: 38, height: 38, background: "var(--surface)", color: "var(--moss)" }}>
                  {client.split(" ").map((w) => w[0]).join("")}
                </div>
                <div className="text-sm font-medium">{client}</div>
              </div>
              <button onClick={() => setClient(null)} className="text-xs font-medium text-[var(--moss)]">Изменить</button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--line)]">
                <Search size={16} className="text-[var(--ink-soft)]" />
                <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Поиск клиента" />
              </div>
              <div className="flex gap-2 mt-2.5 overflow-x-auto">
                {RECENT_CLIENTS.map((name) => (
                  <button key={name} onClick={() => setClient(name)} className="shrink-0 rounded-full px-3.5 py-2 text-sm bg-[var(--surface-alt)] border border-[var(--line)]">
                    {name}
                  </button>
                ))}
                <button className="shrink-0 rounded-full px-3.5 py-2 text-sm flex items-center gap-1 border border-dashed border-[var(--line)] text-[var(--moss)]">
                  <Plus size={14} /> Новый
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mx-5 mt-5">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Услуга</div>
          <div className="grid grid-cols-2 gap-2.5">
            {servicesStatus === "loading" && (
              <div className="col-span-2 text-sm text-center py-4 text-[var(--ink-soft)]">Загружаем услуги…</div>
            )}
            {servicesStatus === "error" && (
              <div className="col-span-2 text-sm text-center py-4 text-[var(--clay)]">Не удалось загрузить услуги</div>
            )}
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
            <div className="flex items-center justify-between">
              <button onClick={() => setTimeMin((m) => Math.max(480, m - 30))} aria-label="Раньше" className="rounded-full p-1.5 bg-[var(--surface-alt)]"><Minus size={14} /></button>
              <span className="text-base font-mono">{minutesToTime(timeMin)}</span>
              <button onClick={() => setTimeMin((m) => Math.min(1200, m + 30))} aria-label="Позже" className="rounded-full p-1.5 bg-[var(--surface-alt)]"><Plus size={14} /></button>
            </div>
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
        </div>

        <div className="mx-5 mt-5">
          <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Заметка к записи</div>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Например: особенности, пожелания клиента…" rows={3}
            className="w-full rounded-2xl p-3.5 text-sm bg-[var(--surface)] border border-[var(--line)] outline-none resize-none"
          />
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto px-5 py-3 bg-[var(--paper)] border-t border-[var(--line)]">
          {mode === "edit" ? (
            <div className="flex items-center gap-2">
              <button className="rounded-full p-3.5 flex items-center justify-center" style={{ background: "var(--clay-soft)", color: "var(--danger)" }} aria-label="Отменить запись"><X size={18} /></button>
              <button className="rounded-full p-3.5 flex items-center justify-center bg-[var(--surface-alt)] border border-[var(--line)]" aria-label="Завершить сессию"><Check size={18} /></button>
              <button onClick={() => navigate("/")} className="flex-1 rounded-full py-3.5 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
                Сохранить изменения
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/")} className="w-full rounded-full py-3.5 text-sm font-medium" style={{ background: "var(--clay)", color: "#FBF9F3" }}>
              Сохранить запись
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
