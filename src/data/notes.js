import { supabase } from "../lib/supabaseClient";

// ── Заметки после сеансов ───────────────────────────────────────────────

export async function getNotes(clientId) {
const { data, error } = await supabase
.from("client_notes")
.select("id,client_id,date,text,created_at")
.eq("client_id", clientId)
.order("created_at", { ascending: false })
.order("id", { ascending: false });
if (error) throw error;
return data || [];
}

function today() {
const d = new Date();
return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");
}

export async function addNote(clientId, text) {
const { data, error } = await supabase
.from("client_notes")
.insert({ client_id: clientId, text: text.trim(), date: today() })
.select("id,client_id,date,text,created_at")
.single();
if (error) throw error;
return data;
}

export async function updateNote(id, text) {
const { data, error } = await supabase
.from("client_notes")
.update({ text: text.trim() })
.eq("id", id)
.select("id,client_id,date,text,created_at")
.single();
if (error) throw error;
return data;
}

export async function deleteNote(id) {
const { error } = await supabase.from("client_notes").delete().eq("id", id);
if (error) throw error;
}

// ── Особенности клиента ─────────────────────────────────────────────────
// Короткий текст, который нужно помнить всегда: травмы, противопоказания,
// пожелания. Виден в карточке, при записи и в календаре.

export async function getHighlights(clientId) {
const { data, error } = await supabase
.from("clients")
.select("highlights")
.eq("id", clientId)
.maybeSingle();
if (error) throw error;
return data?.highlights || "";
}

export async function saveHighlights(clientId, text) {
const { data, error } = await supabase
.from("clients")
.update({ highlights: text.trim() })
.eq("id", clientId)
.select("id,highlights")
.single();
if (error) throw error;
return data;
}
