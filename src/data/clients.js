// Слой доступа к данным о клиентах — реальная база Supabase.
import { supabase } from "../lib/supabaseClient";

export function ratingTag(c) {
  if (c.last_visit?.includes("месяц") || c.last_visit?.includes("год")) return { label: "Редкий клиент", tone: "clay" };
  if (c.visits >= 10 && c.cancellations === 0) return { label: "Постоянный клиент", tone: "moss" };
  if (c.visits <= 2) return { label: "Новый клиент", tone: "clay" };
  return { label: "Обычный клиент", tone: "soft" };
}

function formatDate(value) {
  if (!value) return "Нет визитов";
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

async function getAppointmentStats(clientIds) {
  if (!clientIds?.length) return {};
  const { data, error } = await supabase
    .from("appointments")
    .select("id, client_id, date, price, status")
    .in("client_id", clientIds)
    .lte("date", new Date().toISOString().slice(0, 10));
  if (error) throw error;

  const stats = {};
  for (const id of clientIds) stats[id] = { visits: 0, cancellations: 0, total: 0, lastVisit: null };
  for (const a of data || []) {
    const s = stats[a.client_id] || (stats[a.client_id] = { visits: 0, cancellations: 0, total: 0, lastVisit: null });
    if (a.status === "cancelled") { s.cancellations += 1; continue; }
    s.visits += 1;
    s.total += Number(a.price || 0);
    if (!s.lastVisit || a.date > s.lastVisit) s.lastVisit = a.date;
  }
  return stats;
}

function withStats(client, stats) {
  const s = stats?.[client.id] || { visits: 0, cancellations: 0, total: 0, lastVisit: null };
  return {
    ...client,
    visits: s.visits,
    cancellations: s.cancellations,
    avg_check: s.visits ? Math.round(s.total / s.visits) : 0,
    last_visit: formatDate(s.lastVisit),
    total_spent: s.total,
  };
}

export async function getClients() {
  const { data, error } = await supabase.from("clients").select("*").order("id", { ascending: true });
  if (error) throw error;
  const stats = await getAppointmentStats((data || []).map((c) => c.id));
  return (data || []).map((c) => withStats(c, stats));
}

export async function getClientById(id) {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const stats = await getAppointmentStats([data.id]);
  return withStats(data, stats);
}

export async function getHistory(clientId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, date, price, status, services(name, color)")
    .eq("client_id", clientId)
    .neq("status", "cancelled")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map((a) => ({ id: a.id, date: formatDate(a.date), price: Number(a.price || 0), service: a.services?.name || "Услуга", color: a.services?.color }));
}

export async function getPayments(clientId) {
  const { data, error } = await supabase.from("client_payments").select("*").eq("client_id", clientId).order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getNotes(clientId) {
  const { data, error } = await supabase.from("client_notes").select("*").eq("client_id", clientId).order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addNote(clientId, text) {
  const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const { data, error } = await supabase.from("client_notes").insert({ client_id: clientId, date, text }).select().single();
  if (error) throw error;
  return data;
}

export async function getRecommendation(clientId) {
  const { data, error } = await supabase.from("client_recommendations").select("text").eq("client_id", clientId).maybeSingle();
  if (error) throw error;
  return data?.text || "Рекомендаций пока нет — появятся после первых сессий.";
}

function initialsFromName(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

const PALETTE = ["#7C9A86", "#B98572", "#9C8FB0", "#C6A15B", "#6B8CAE"];

export async function createClient({ name, phone }) {
  const payload = { name: name.trim(), phone: phone?.trim() || "", initials: initialsFromName(name), visits: 0, cancellations: 0, avg_check: 0, last_visit: "Нет визитов", favorite_service: "", color: PALETTE[Math.floor(Math.random() * PALETTE.length)] };
  const { data, error } = await supabase.from("clients").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
