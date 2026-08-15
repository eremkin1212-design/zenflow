import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function ChangePassword() {
const [open, setOpen] = useState(false);
const [password, setPassword] = useState("");
const [repeat, setRepeat] = useState("");
const [show, setShow] = useState(false);
const [busy, setBusy] = useState(false);
const [note, setNote] = useState("");
const [ok, setOk] = useState(false);

function reset() {
setPassword("");
setRepeat("");
setShow(false);
setNote("");
setOk(false);
}

async function save() {
setNote("");
if (password.length < 6) {
setNote("Пароль должен быть не короче 6 символов");
setOk(false);
return;
}
if (password !== repeat) {
setNote("Пароли не совпадают");
setOk(false);
return;
}

setBusy(true);
try {
const { error } = await supabase.auth.updateUser({ password });
if (error) throw error;
setOk(true);
setNote("Пароль изменён");
setPassword("");
setRepeat("");
setTimeout(() => { setOpen(false); reset(); }, 1500);
} catch (e) {
setOk(false);
const msg = String(e?.message || "");
if (msg.includes("same as the old")) setNote("Это тот же пароль, что и раньше");
else if (msg.includes("session")) setNote("Сессия истекла — войди заново и попробуй ещё раз");
else setNote("Не удалось изменить пароль. Попробуй ещё раз.");
} finally {
setBusy(false);
}
}

if (!open) {
return (
<button
onClick={() => { reset(); setOpen(true); }}
className="w-full rounded-2xl p-4 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]"
>
<KeyRound size={16} className="text-[var(--moss)]" />
<span className="text-sm">Сменить пароль</span>
</button>
);
}

return (
<div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-sm font-medium flex items-center gap-2">
<KeyRound size={15} className="text-[var(--moss)]" />
Новый пароль
</div>

<div className="relative mt-3">
<input
type={show ? "text" : "password"}
value={password}
onChange={(e) => setPassword(e.target.value)}
placeholder="Новый пароль"
autoComplete="new-password"
className="w-full rounded-xl p-2.5 pr-10 text-sm bg-[var(--surface-alt)] outline-none"
/>
<button
onClick={() => setShow((v) => !v)}
aria-label={show ? "Скрыть пароль" : "Показать пароль"}
className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5"
>
{show ? <EyeOff size={15} className="text-[var(--ink-soft)]" /> : <Eye size={15} className="text-[var(--ink-soft)]" />}
</button>
</div>

<input
type={show ? "text" : "password"}
value={repeat}
onChange={(e) => setRepeat(e.target.value)}
placeholder="Повтори пароль"
autoComplete="new-password"
className="w-full mt-2 rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none"
/>

{note && (
<div className="text-xs mt-2 flex items-start gap-1.5" style={{ color: ok ? "var(--ink-soft)" : "var(--danger)" }}>
{ok && <Check size={13} className="mt-0.5 shrink-0 text-[var(--moss)]" />}
<span>{note}</span>
</div>
)}

<div className="flex gap-2 mt-3">
<button
onClick={() => { setOpen(false); reset(); }}
className="flex-1 rounded-full py-2.5 text-sm font-medium bg-[var(--surface-alt)]"
>
Отмена
</button>
<button
onClick={save}
disabled={busy}
className="flex-1 rounded-full py-2.5 text-sm font-medium"
style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy ? 0.6 : 1 }}
>
{busy ? "Сохраняем…" : "Сохранить"}
</button>
</div>
</div>
);
}
