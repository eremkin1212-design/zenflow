import React, { useEffect, useState } from "react";
import { Bell, BellOff, Check, Send } from "lucide-react";
import { getPushState, enablePush, disablePush, sendTestPush, isStandalone, isIOS, pushSupported } from "../data/push";

export default function PushToggle() {
const [state, setState] = useState({ supported: true, permission: "default", subscribed: false });
const [busy, setBusy] = useState(false);
const [note, setNote] = useState("");
const standalone = isStandalone();
const ios = isIOS();

useEffect(() => { getPushState().then(setState).catch(() => {}); }, []);

async function handleEnable() {
setBusy(true); setNote("");
try {
await enablePush();
setState(await getPushState());
setNote("Уведомления включены на этом устройстве");
} catch (e) {
if (e?.message === "denied") setNote("Разрешение не выдано. Включить можно в настройках телефона для ZenFlow.");
else if (e?.message === "unsupported") setNote("Это устройство не поддерживает пуш-уведомления");
else setNote("Не получилось включить. Попробуй ещё раз.");
} finally { setBusy(false); }
}

async function handleDisable() {
setBusy(true); setNote("");
try {
await disablePush();
setState(await getPushState());
setNote("Уведомления отключены на этом устройстве");
} catch {
setNote("Не получилось отключить");
} finally { setBusy(false); }
}

async function handleTest() {
setBusy(true); setNote("");
try {
await sendTestPush();
setNote("Тестовое уведомление отправлено");
} catch {
setNote("Отправщик пока не развёрнут — это следующий шаг");
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
{state.subscribed ? "Устройство получает напоминания о записях" : "Напоминания о записях приходят на телефон"}
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

{blocked && (
<div className="text-xs mt-2 text-[var(--clay)]">
Уведомления заблокированы в настройках телефона. Разреши их для ZenFlow и вернись сюда.
</div>
)}

{state.subscribed && (
<button onClick={handleTest} disabled={busy} className="mt-3 w-full rounded-full py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 bg-[var(--surface-alt)]">
<Send size={13} /> Прислать тестовое
</button>
)}

{note && (
<div className="text-xs mt-2 flex items-start gap-1.5" style={{ color: "var(--ink-soft)" }}>
<Check size={13} className="mt-0.5 shrink-0 text-[var(--moss)]" />
<span>{note}</span>
</div>
)}
</div>
);
}
