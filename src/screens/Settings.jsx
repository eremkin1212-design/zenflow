import React, { useEffect, useState } from "react";
import { ChevronRight, Plus, LogOut, Trash2 } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import Switch from "../components/Switch";
import { useTheme } from "../theme";
import { getServices, createService, deleteService } from "../data/services";

const INITIAL_DAYS = [
  { key: "mon", label: "Понедельник", on: true, hours: "09:00–20:00" },
  { key: "tue", label: "Вторник", on: true, hours: "09:00–20:00" },
  { key: "wed", label: "Среда", on: true, hours: "09:00–20:00" },
  { key: "thu", label: "Четверг", on: true, hours: "09:00–20:00" },
  { key: "fri", label: "Пятница", on: true, hours: "09:00–20:00" },
  { key: "sat", label: "Суббота", on: true, hours: "10:00–16:00" },
  { key: "sun", label: "Воскресенье", on: false, hours: "Выходной" },
];

const COLOR_OPTIONS = ["#7C9A86", "#B98572", "#9C8FB0", "#C6A15B", "#6B8CAE"];

function Row({ left, right, sub }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm">{left}</div>
        {sub && <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export default function Settings() {
  const { dark, setDark } = useTheme();
  const [days, setDays] = useState(INITIAL_DAYS);
  const [notify, setNotify] = useState({ client: true, me: true, sound: false });

  const [services, setServices] = useState([]);
  const [servicesStatus, setServicesStatus] = useState("loading");
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ name: "", duration: 60, price: 0, color: COLOR_OPTIONS[0] });
  const [savingService, setSavingService] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getServices()
      .then((data) => { if (!cancelled) { setServices(data); setServicesStatus("ready"); } })
      .catch(() => { if (!cancelled) setServicesStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  function toggleDay(key) {
    setDays((prev) => prev.map((d) => (d.key === key ? { ...d, on: !d.on } : d)));
  }

  async function handleAddService() {
    if (!newService.name.trim()) return;
    setSavingService(true);
    try {
      const created = await createService(newService);
      setServices((prev) => [...prev, created]);
      setNewService({ name: "", duration: 60, price: 0, color: COLOR_OPTIONS[0] });
      setShowAddService(false);
    } catch {
      window.alert("Не удалось сохранить услугу. Проверь подключение и попробуй снова.");
    } finally {
      setSavingService(false);
    }
  }

  async function handleDeleteService(id, name) {
    if (!window.confirm(`Удалить услугу «${name}»?`)) return;
    try {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      window.alert("Не удалось удалить. Проверь подключение и попробуй снова.");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-center justify-between px-5 pt-7 pb-3">
          <div className="text-2xl font-serif" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>Настройки</div>
          <ThemeToggle />
        </div>

        <button className="mx-5 w-[calc(100%-2.5rem)] rounded-2xl p-4 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]">
          <div className="rounded-full flex items-center justify-center font-serif" style={{ width: 48, height: 48, background: "var(--moss-soft)", color: "var(--moss)", fontWeight: 500 }}>ЛТ</div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Лиза Терехова</div>
            <div className="text-xs mt-0.5 text-[var(--ink-soft)]">Массажист · +7 916 000-00-00</div>
          </div>
          <ChevronRight size={16} className="text-[var(--ink-soft)]" />
        </button>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-1 text-[var(--ink-soft)]">Рабочее время</div>
          <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
            {days.map((d, i) => (
              <div key={d.key} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <Row left={d.label} sub={d.on ? d.hours : "Выходной"} right={<Switch on={d.on} onChange={() => toggleDay(d.key)} label={d.label} />} />
              </div>
            ))}
          </div>
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-1 text-[var(--ink-soft)]">Услуги и стоимость</div>

          {servicesStatus === "loading" && (
            <div className="text-sm text-center py-6 text-[var(--ink-soft)]">Загружаем услуги…</div>
          )}
          {servicesStatus === "error" && (
            <div className="text-sm text-center py-6 text-[var(--clay)]">Не удалось загрузить услуги</div>
          )}

          {servicesStatus === "ready" && (
            <>
              <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
                {services.map((s, i) => (
                  <div key={s.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                    <Row
                      left={<span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />{s.name}</span>}
                      sub={`${s.duration} мин`}
                      right={
                        <span className="flex items-center gap-2 text-sm">
                          <span className="font-mono">{s.price.toLocaleString("ru-RU")} ₽</span>
                          <button onClick={() => handleDeleteService(s.id, s.name)} aria-label={`Удалить ${s.name}`} className="p-1">
                            <Trash2 size={15} className="text-[var(--danger)]" />
                          </button>
                        </span>
                      }
                    />
                  </div>
                ))}
                {services.length === 0 && <div className="text-sm text-center py-4 text-[var(--ink-soft)]">Услуг пока нет</div>}
              </div>

              {showAddService ? (
                <div className="mt-2.5 rounded-2xl p-3.5 flex flex-col gap-2.5 bg-[var(--surface)] border border-[var(--line)]">
                  <input
                    value={newService.name}
                    onChange={(e) => setNewService((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Название услуги"
                    className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="number" value={newService.duration}
                      onChange={(e) => setNewService((s) => ({ ...s, duration: Number(e.target.value) || 0 }))}
                      placeholder="Минуты"
                      className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none"
                    />
                    <input
                      type="number" value={newService.price}
                      onChange={(e) => setNewService((s) => ({ ...s, price: Number(e.target.value) || 0 }))}
                      placeholder="Цена ₽"
                      className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c} onClick={() => setNewService((s) => ({ ...s, color: c }))}
                        aria-label={`Цвет ${c}`}
                        className="rounded-full"
                        style={{ width: 22, height: 22, background: c, boxShadow: newService.color === c ? "0 0 0 2px var(--ink)" : "none" }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setShowAddService(false)} className="flex-1 rounded-full py-2.5 text-sm font-medium bg-[var(--surface-alt)]">Отмена</button>
                    <button onClick={handleAddService} disabled={savingService} className="flex-1 rounded-full py-2.5 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: savingService ? 0.6 : 1 }}>
                      {savingService ? "Сохраняем…" : "Сохранить"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddService(true)} className="mt-2.5 w-full rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-1.5 border border-dashed border-[var(--line)] text-[var(--moss)]">
                  <Plus size={15} /> Добавить услугу
                </button>
              )}
            </>
          )}
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-1 text-[var(--ink-soft)]">Уведомления</div>
          <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
            <Row left="Напоминание клиенту" sub="За 2 часа до записи" right={<Switch on={notify.client} onChange={() => setNotify((n) => ({ ...n, client: !n.client }))} label="Напоминание клиенту" />} />
            <div style={{ borderTop: "1px solid var(--line)" }}>
              <Row left="Напоминание мне" sub="За 30 минут до записи" right={<Switch on={notify.me} onChange={() => setNotify((n) => ({ ...n, me: !n.me }))} label="Напоминание мне" />} />
            </div>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              <Row left="Звук уведомлений" right={<Switch on={notify.sound} onChange={() => setNotify((n) => ({ ...n, sound: !n.sound }))} label="Звук уведомлений" />} />
            </div>
          </div>
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-1 text-[var(--ink-soft)]">Тема</div>
          <div className="flex rounded-full p-1 bg-[var(--surface-alt)] border border-[var(--line)]">
            {[["light", "Светлая", false], ["dark", "Тёмная", true]].map(([key, label, val]) => (
              <button key={key} onClick={() => setDark(val)} className="flex-1 rounded-full py-2 text-sm font-medium"
                style={{ background: dark === val ? "var(--moss)" : "transparent", color: dark === val ? "var(--on-accent)" : "var(--ink-soft)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-5 mt-6">
          <button className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "var(--clay-soft)", color: "var(--clay)" }}>
            <LogOut size={16} /> Выйти из аккаунта
          </button>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
