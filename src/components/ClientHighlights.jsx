import React, { useEffect, useState } from "react";
import { AlertTriangle, Pencil, Check, Plus } from "lucide-react";
import { getHighlights, saveHighlights } from "../data/notes";

export default function ClientHighlights({ clientId, initial }) {
const [text, setText] = useState(initial ?? "");
const [draft, setDraft] = useState("");
const [editing, setEditing] = useState(false);
const [busy, setBusy] = useState(false);

useEffect(() => {
if (initial !== undefined) return;
let dead = false;
getHighlights(clientId).then((v) => { if (!dead) setText(v); }).catch(() => {});
return () => { dead = true; };
}, [clientId, initial]);

async function save() {
setBusy(true);
try {
await saveHighlights(clientId, draft);
setText(draft.trim());
setEditing(false);
} catch {
window.alert("Не удалось сохранить. Проверь подключение.");
} finally {
setBusy(false);
}
}

if (editing) {
return (
<div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-xs font-medium mb-2 flex items-center gap-1.5 text-[var(--ink-soft)]">
<AlertTriangle size={13} className="text-[var(--clay)]" /> Важно помнить
</div>
<textarea
value={draft}
onChange={(e) => setDraft(e.target.value)}
rows={3}
placeholder="Травмы, противопоказания, пожелания. Например: не давить на поясницу, аллергия на масло с цитрусом"
className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none resize-none"
/>
<div className="flex gap-2 mt-2">
<button onClick={() => setEditing(false)} className="flex-1 rounded-full py-2 text-sm font-medium bg-[var(--surface-alt)]">
Отмена
</button>
<button onClick={save} disabled={busy} className="flex-1 rounded-full py-2 text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy ? 0.6 : 1 }}>
<Check size={14} /> {busy ? "Сохраняем…" : "Сохранить"}
</button>
</div>
</div>
);
}

if (!text) {
return (
<button
onClick={() => { setDraft(""); setEditing(true); }}
className="w-full rounded-2xl p-3 flex items-center justify-center gap-1.5 text-xs font-medium border border-dashed border-[var(--line)] text-[var(--ink-soft)]"
>
<Plus size={14} /> Добавить важное о клиенте
</button>
);
}

return (
<div className="rounded-2xl p-3.5" style={{ background: "var(--clay-soft)" }}>
<div className="flex items-start gap-2">
<AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--clay)" }} />
<div className="flex-1 min-w-0">
<div className="text-xs font-medium" style={{ color: "var(--clay)" }}>Важно помнить</div>
<div className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">{text}</div>
</div>
<button onClick={() => { setDraft(text); setEditing(true); }} aria-label="Изменить" className="shrink-0 p-1">
<Pencil size={14} style={{ color: "var(--clay)" }} />
</button>
</div>
</div>
);
}
