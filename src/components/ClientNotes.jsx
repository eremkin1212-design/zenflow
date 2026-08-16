import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { getNotes, addNote, updateNote, deleteNote } from "../data/notes";

export default function ClientNotes({ clientId }) {
const [notes, setNotes] = useState([]);
const [status, setStatus] = useState("loading");
const [adding, setAdding] = useState(false);
const [draft, setDraft] = useState("");
const [editingId, setEditingId] = useState(null);
const [editDraft, setEditDraft] = useState("");
const [busy, setBusy] = useState(false);

useEffect(() => {
let dead = false;
setStatus("loading");
getNotes(clientId)
.then((rows) => { if (!dead) { setNotes(rows); setStatus("ready"); } })
.catch(() => { if (!dead) setStatus("error"); });
return () => { dead = true; };
}, [clientId]);

async function create() {
if (!draft.trim()) return;
setBusy(true);
try {
const row = await addNote(clientId, draft);
setNotes((p) => [row, ...p]);
setDraft("");
setAdding(false);
} catch {
window.alert("Не удалось сохранить заметку.");
} finally {
setBusy(false);
}
}

async function saveEdit() {
if (!editDraft.trim()) return;
setBusy(true);
try {
const row = await updateNote(editingId, editDraft);
setNotes((p) => p.map((n) => (n.id === editingId ? row : n)));
setEditingId(null);
} catch {
window.alert("Не удалось сохранить изменения.");
} finally {
setBusy(false);
}
}

async function remove(note) {
if (!window.confirm("Удалить эту заметку?")) return;
try {
await deleteNote(note.id);
setNotes((p) => p.filter((n) => n.id !== note.id));
} catch {
window.alert("Не удалось удалить.");
}
}

return (
<div className="flex flex-col gap-2.5">
{adding ? (
<div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
<textarea
value={draft}
onChange={(e) => setDraft(e.target.value)}
rows={3}
autoFocus
placeholder="Как прошёл сеанс: с чем работали, что просил клиент, что помогло"
className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none resize-none"
/>
<div className="flex gap-2 mt-2">
<button onClick={() => { setAdding(false); setDraft(""); }} className="flex-1 rounded-full py-2 text-sm font-medium bg-[var(--surface-alt)]">
Отмена
</button>
<button onClick={create} disabled={busy} className="flex-1 rounded-full py-2 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy ? 0.6 : 1 }}>
{busy ? "Сохраняем…" : "Сохранить"}
</button>
</div>
</div>
) : (
<button
onClick={() => setAdding(true)}
className="rounded-2xl p-3 flex items-center justify-center gap-1.5 text-sm font-medium border border-dashed border-[var(--line)]"
style={{ color: "var(--moss)" }}
>
<Plus size={15} /> Добавить заметку
</button>
)}

{status === "loading" && <div className="text-sm text-center py-4 text-[var(--ink-soft)]">Загружаем…</div>}
{status === "error" && <div className="text-sm text-center py-4 text-[var(--clay)]">Не удалось загрузить заметки</div>}

{status === "ready" && notes.length === 0 && !adding && (
<div className="text-sm text-center py-4 text-[var(--ink-soft)]">
Заметок пока нет. После сеанса запиши, с чем работали — потом пригодится.
</div>
)}

{notes.map((note) =>
editingId === note.id ? (
<div key={note.id} className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
<textarea
value={editDraft}
onChange={(e) => setEditDraft(e.target.value)}
rows={3}
className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none resize-none"
/>
<div className="flex gap-2 mt-2">
<button onClick={() => setEditingId(null)} className="flex-1 rounded-full py-2 text-sm font-medium bg-[var(--surface-alt)]">
Отмена
</button>
<button onClick={saveEdit} disabled={busy} className="flex-1 rounded-full py-2 text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy ? 0.6 : 1 }}>
<Check size={14} /> {busy ? "Сохраняем…" : "Сохранить"}
</button>
</div>
</div>
) : (
<div key={note.id} className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-sm leading-relaxed whitespace-pre-wrap">{note.text}</div>
<div className="flex items-center justify-between mt-2">
<span className="text-xs text-[var(--ink-soft)]">{note.date}</span>
<div className="flex items-center gap-1">
<button onClick={() => { setEditingId(note.id); setEditDraft(note.text); }} aria-label="Изменить" className="p-1">
<Pencil size={14} className="text-[var(--moss)]" />
</button>
<button onClick={() => remove(note)} aria-label="Удалить" className="p-1">
<Trash2 size={14} style={{ color: "var(--danger)" }} />
</button>
</div>
</div>
</div>
)
)}
</div>
);
}
