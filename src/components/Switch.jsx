import React from "react";

export default function Switch({ on, onChange, label }) {
  async function handleClick() {
    if (label === "Напоминание мне" && !on) {
      if (!("Notification" in window)) {
        window.alert("Этот браузер не поддерживает уведомления.");
        return;
      }
      if (Notification.permission === "denied") {
        window.alert("Уведомления запрещены. Разреши их для приложения в настройках iPhone.");
        return;
      }
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }
    }
    onChange();
  }

  return (
    <button
      onClick={handleClick}
      aria-pressed={on}
      aria-label={label}
      className="relative rounded-full w-[42px] h-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--moss)]"
      style={{ background: on ? "var(--moss)" : "var(--line)" }}
    >
      <span
        className="absolute rounded-full w-[18px] h-[18px] top-[3px] transition-all"
        style={{ left: on ? 21 : 3, background: "var(--on-accent)" }}
      />
    </button>
  );
}
