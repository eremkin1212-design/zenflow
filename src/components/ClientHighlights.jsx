import React, { useEffect, useState } from "react";
import { AlertTriangle, Pencil, Check, Plus, UserRoundPen } from "lucide-react";
import { getHighlights, saveHighlights } from "../data/notes";
import { getClientById } from "../data/clients";
import { updateClientProfile } from "../data/clientProfile";

export default function ClientHighlights({ clientId, initial }) {
const [text, setText] = useState(initial ?? "");
const [draft, setDraft] = useState("");
const [editing, setEditing] = useState(false);
const [busy, setBusy] = useState(false);
const [profileEditing, setProfileEditing] = useState(false);
const [profileBusy, setProfileBusy] = useState(false);
const [profile, setProfile] = useState({ name: "", phone: "" });

useEffect(() => {
let dead = false;
getClientById(clientId).then((client) => {
if (!dead && client) setProfile({ name: client.name || "", phone: client.phone || "" });
}).catch(() => {});
if (initial === undefined) {
getHighlights(clientId).then((v) => { if (!dead) setText(v); }).catch(() => {});
}
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

async function saveProfile() {
if (!profile.name.trim()) {
window.alert("Имя клиента не может быть пустым.");
return;
}
setProfileBusy(true);
try {
await updateClientProfile(clientId, profile);
setProfileEditing(false);
window.location.reload();
} catch (error) {
window.alert(error?.message || "Не удалось изменить клиента. Проверь подключение.");
} finally {
setProfileBusy(false);
}
}

function ProfileEditor() {
if (profileEditing) {
return (
<div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)] mb-3">
<div className="text-sm font-medium mb-3 flex items-center gap-2"><UserRoundPen size={15} className="text-[var(--moss)]" /> Редактировать клиента</div>
<input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Имя" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" />
<input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="Телефон" inputMode="tel" className="w-full rounded-xl p-2.5 mt-2 text-sm bg-[var(--surface-alt)] outline-none" />
<div className="flex gap-2 mt-3">
<button onClick={() => setProfileEditing(false)} disabled={profileBusy} className="flex-1 rounded-full py-2 text-sm font-medium bg-[var(--surface-alt)]">Отмена</button>
<button onClick={saveProfile} disabled={profileBusy} className="flex-1 rounded-full py-2 text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: profileBusy ? 0.6 : 1 }}><Check size={14} /> {profileBusy ? "Сохраняем…" : "Сохранить"}</button>
</div>
</div>
);
}
return (
<button onClick={() => setProfileEditing(true)} className="w-full mb-3 rounded-2xl px-3.5 py-3 flex items-center justify-between bg-[var(--surface)] border border-[var(--line)]">
<span className="flex items-center gap-2 text-sm font-medium"><UserRoundPen size={15} className="text-[var(--moss)]" /> Редактировать клиента</span>
<Pencil size={14} className="text-[var(--ink-soft)]" />
</button>
);
}

let highlightsContent;
if (editing) {
highlightsContent = (
<div className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]">
<div className="text-xs font-medium mb-2 flex items-center gap-1.5 text-[var(--ink-soft)]"><AlertTriangle size={13} className="text-[var(--clay)]" /> Важно помнить</div>
<textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Травмы, противопоказания, пожелания. Например: не давить на поясницу, аллергия на масло с цитрусом" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none resize-none" />
<div className="flex gap-2 mt-2">
<button onClick={() => setEditing(false)} className="flex-1 rounded-full py-2 text-sm font-medium bg-[var(--surface-alt)]">Отмена</button>
<button onClick={save} disabled={busy} className="flex-1 rounded-full py-2 text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy ? 0.6 : 1 }}><Check size={14} /> {busy ? "Сохраняем…" : "Сохранить"}</button>
</div>
</div>
);
} else if (!text) {
highlightsContent = (
<button onClick={() => { setDraft(""); setEditing(true); }} className="w-full rounded-2xl p-3 flex items-center justify-center gap-1.5 text-xs font-medium border border-dashed border-[var(--line)] text-[var(--ink-soft)]"><Plus size={14} /> Добавить важное о клиенте</button>
);
} else {
highlightsContent = (
<div className="rounded-2xl p-3.5" style={{ background: "var(--clay-soft)" }}>
<div className="flex items-start gap-2">
<AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--clay)" }} />
<div className="flex-1 min-w-0"><div className="text-xs font-medium" style={{ color: "var(--clay)" }}>Важно помнить</div><div className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">{text}</div></div>
<button onClick={() => { setDraft(text); setEditing(true); }} aria-label="Изменить" className="shrink-0 p-1"><Pencil size={14} style={{ color: "var(--clay)" }} /></button>
</div>
</div>
);
}

return <><ProfileEditor />{highlightsContent}</>;
}
