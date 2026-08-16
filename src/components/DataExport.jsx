import React, { useState } from "react";
import { Download, Check, AlertCircle } from "lucide-react";
import { EXPORTS, exportTable } from "../data/exports";

export default function DataExport() {
const [open, setOpen] = useState(false);
const [format, setFormat] = useState("xls");
const [busy, setBusy] = useState(null);
const [note, setNote] = useState("");
const [error, setError] = useState(false);

async function run(item) {
setBusy(item.key);
setNote("");
setError(false);
try {
const count = await exportTable(item.key, format);
setNote(`${item.label}: ${count} ${count === 1 ? "строка" : "строк"}`);
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
total += await exportTable(item.key, format);
// пауза, иначе браузер блокирует пачку скачиваний
await new Promise((r) => setTimeout(r, 500));
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
Резервная копия или основа для своих расчётов.
</div>

<div className="flex rounded-full p-1 mt-3 bg-[var(--surface-alt)]">
{[["xls", "Для Excel"], ["csv", "CSV"]].map(([key, label]) => (
<button
key={key}
onClick={() => setFormat(key)}
className="flex-1 rounded-full py-1.5 text-xs font-medium"
style={{ background: format === key ? "var(--moss)" : "transparent", color: format === key ? "var(--on-accent)" : "var(--ink-soft)" }}
>
{label}
</button>
))}
</div>
<div className="text-[11px] mt-1.5 text-[var(--ink-soft)]">
{format === "xls"
? "Открывается двойным щелчком, буквы не ломаются."
: "Для загрузки в другие программы. В Excel может потребоваться выбрать кодировку UTF-8."}
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
