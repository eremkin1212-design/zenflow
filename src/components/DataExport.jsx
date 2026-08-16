import React, { useState } from "react";
import { Download, Check, AlertCircle } from "lucide-react";
import { EXPORTS } from "../data/exports";

export default function DataExport() {
const [open, setOpen] = useState(false);
const [busy, setBusy] = useState(null);
const [note, setNote] = useState("");
const [error, setError] = useState(false);

async function run(item) {
setBusy(item.key);
setNote("");
setError(false);
try {
const count = await item.run();
setNote(`${item.label}: выгружено ${count} ${count === 1 ? "строка" : "строк"}`);
} catch {
setError(true);
setNote(`Не удалось выгрузить «${item.label}». Проверь подключение.`);
} finally {
setBusy(null);
}
}

async function runAll() {
setBusy("all");
setNote("");
setError(false);
try {
let total = 0;
for (const item of EXPORTS) {
// небольшая пауза, иначе браузер блокирует пачку скачиваний
total += await item.run();
await new Promise((r) => setTimeout(r, 400));
}
setNote(`Готово: ${EXPORTS.length} файла, ${total} строк`);
} catch {
setError(true);
setNote("Часть файлов не выгрузилась. Попробуй по одному.");
} finally {
setBusy(null);
}
}

if (!open) {
return (
<button
onClick={() => { setOpen(true); setNote(""); }}
className="w-full rounded-2xl p-4 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]"
>
<Download size={16} className="text-[var(--moss)]" />
<span className="text-sm">Выгрузить данные</span>
</button>
);
}

return (
<div className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-sm font-medium flex items-center gap-2">
<Download size={15} className="text-[var(--moss)]" />
Выгрузка данных
</div>
<div className="text-xs mt-1 leading-relaxed text-[var(--ink-soft)]">
Таблицы CSV — открываются в Excel и Numbers. Пригодится как резервная копия
или чтобы посчитать что-то своё.
</div>

<button
onClick={runAll}
disabled={busy !== null}
className="w-full mt-3 rounded-full py-2.5 text-sm font-medium"
style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy ? 0.6 : 1 }}
>
{busy === "all" ? "Выгружаем…" : "Скачать всё"}
</button>

<div className="grid grid-cols-2 gap-2 mt-2">
{EXPORTS.map((item) => (
<button
key={item.key}
onClick={() => run(item)}
disabled={busy !== null}
className="rounded-xl py-2 text-xs font-medium bg-[var(--surface-alt)]"
style={{ opacity: busy && busy !== item.key ? 0.5 : 1 }}
>
{busy === item.key ? "…" : item.label}
</button>
))}
</div>

{note && (
<div className="text-xs mt-3 flex items-start gap-1.5" style={{ color: error ? "var(--danger)" : "var(--ink-soft)" }}>
{error ? <AlertCircle size={13} className="mt-0.5 shrink-0" /> : <Check size={13} className="mt-0.5 shrink-0 text-[var(--moss)]" />}
<span>{note}</span>
</div>
)}

<button onClick={() => { setOpen(false); setNote(""); }} className="w-full mt-3 rounded-full py-2.5 text-sm font-medium bg-[var(--surface-alt)]">
Закрыть
</button>
</div>
);
}
