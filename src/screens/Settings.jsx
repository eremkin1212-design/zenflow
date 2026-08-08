import React, { useState } from "react";
import { ChevronRight, Plus, LogOut } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import Switch from "../components/Switch";
import { useTheme } from "../theme";

const INITIAL_DAYS = [
  { key: "mon", label: "Понедельник", on: true, hours: "09:00–20:00" },
  { key: "tue", label: "Вторник", on: true, hours: "09:00–20:00" },
  { key: "wed", label: "Среда", on: true, hours: "09:00–20:00" },
  { key: "thu", label: "Четверг", on: true, hours: "09:00–20:00" },
  { key: "fri", label: "Пятница", on: true, hours: "09:00–20:00" },
  { key: "sat", label: "Суббота", on: true, hours: "10:00–16:00" },
  { key: "sun", label: "Воскресенье", on: false, hours: "Выходной" },
];

const SERVICES = [
  { key: "classic", name: "Классический массаж", color: "#7C9A86", dur: 60, price: 4200 },
  { key: "sport", name: "Спортивный массаж", color: "#B98572", dur: 90, price: 5200 },
  { key: "lymph", name: "Лимфодренаж", color: "#9C8FB0", dur: 60, price: 3800 },
  { key: "face", name: "Массаж лица", color: "#C6A15B", dur: 45, price: 2800 },
];

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

  function toggleDay(key) {
    setDays((prev) => prev.map((d) => (d.key === key ? { ...d, on: !d.on } : d)));
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
          <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
            {SERVICES.map((s, i) => (
              <div key={s.key} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <Row
                  left={<span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />{s.name}</span>}
                  sub={`${s.dur} мин`}
                  right={<span className="flex items-center gap-1.5 text-sm font-mono">{s.price.toLocaleString("ru-RU")} ₽ <ChevronRight size={14} className="text-[var(--ink-soft)]" /></span>}
                />
              </div>
            ))}
          </div>
          <button className="mt-2.5 w-full rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-1.5 border border-dashed border-[var(--line)] text-[var(--moss)]">
            <Plus size={15} /> Добавить услугу
          </button>
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
