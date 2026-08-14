import React, { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { getPushState, enablePush, disablePush, countSubscriptions, isStandalone, isIOS, pushSupported } from "../data/push";

export default function PushToggle() {
const [state, setState] = useState({ supported: true, permission: "default", subscribed: false });
const [devices, setDevices] = useState(null);
const [busy, setBusy] = useState(false);
const [note, setNote] = useState("");
const standalone = isStandalone();
const ios = isIOS();

async function refresh() {
try {
setState(await getPushState());
setDevices(await countSubscriptions());
} catch { /* не критично */ }
}

useEffect(() => { refresh(); }, []);

async function handleEnable() {
setBusy(true); setNote("");
try {
await enablePush();
await refresh();
setNote("Готово. Напоминание придёт за 30 минут до записи.");
} catch (e) {
const msg = e?.message;
if (msg === "denied") setNote("Разрешение не выдано. Включить можно в настройках телефона для ZenFlow.");
else if (msg === "unsupported") setNote("Это устройство не поддерживает пуш-уведомления.");
else if (msg === "no-user") setNote("Нужно войти в приложение.");
else setNote("Не получилось включить. Попробуй ещё раз.");
} finally { setBusy(false); }
}

async function handleDisable() {
setBusy(true); setNote("");
try {
await disablePush();
await refresh();
setNote("Уведомления отключены на этом устройстве.");
} catch {
setNote("Не получилось отключить.");
} finally { setBusy(false); }
}

if (!pushSupported()) {
return (
<div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-sm">Пуш-уведомления недоступны</div>
<div className="text-xs mt-1 text-[var(--ink-soft)]">Этот браузер их не поддерживает.</div>
</div>
);
}

// На iOS пуши работают только из приложения на домашнем экране.
if (ios && !standalone) {
return (
<div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-sm font-medium">Установи приложение на экран</div>
<div className="text-xs mt-1 leading-relaxed text-[var(--ink-soft)]">
На iPhone уведомления приходят только приложению с домашнего экрана.
В Safari нажми «Поделиться» → «На экран Домой», потом открой ZenFlow с иконки и включи уведомления здесь.
</div>
</div>
);
}

const blocked = state.permission === "denied";

return (
<div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="flex items-start justify-between gap-3">
<div className="flex-1">
<div className="text-sm font-medium flex items-center gap-1.5">
{state.subscribed ? <Bell size={15} className="text-[var(--moss)]" /> : <BellOff size={15} className="text-[var(--ink-soft)]" />}
Пуши на это устройство
</div>
<div className="text-xs mt-1 text-[var(--ink-soft)]">
{state.subscribed
? `Напоминание за 30 минут до записи${devices ? ` · устройств: ${devices}` : ""}`
: "Напоминания о записях будут приходить на телефон"}
</div>
</div>
{state.subscribed ? (
<button onClick={handleDisable} disabled={busy} className="rounded-full px-3 py-2 text-xs font-medium bg-[var(--surface-alt)]">
{busy ? "…" : "Отключить"}
</button>
) : (
<button onClick={handleEnable} disabled={busy || blocked} className="rounded-full px-3 py-2 text-xs font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy || blocked ? 0.6 : 1 }}>
{busy ? "…" : "Включить"}
</button>
)}
</div>

{state.subscribed && devices === 0 && (
<div className="text-xs mt-2 text-[var(--clay)]">
Телефон подписан, но в базе устройства нет. Нажми «Отключить», затем «Включить» ещё раз.
</div>
)}

{blocked && (
<div className="text-xs mt-2 text-[var(--clay)]">
Уведомления заблокированы в настройках телефона. Разреши их для ZenFlow и вернись сюда.
</div>
)}

{note && (
<div className="text-xs mt-2 flex items-start gap-1.5 text-[var(--ink-soft)]">
<Check size={13} className="mt-0.5 shrink-0 text-[var(--moss)]" />
<span>{note}</span>
</div>
)}
</div>
);
}
