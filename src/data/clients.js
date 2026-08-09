// Слой доступа к данным о клиентах — теперь реальная база (Supabase)
// вместо моков. Экраны используют эти функции, не обращаясь к supabase
// напрямую — если бэкенд когда-то сменится, менять придётся только этот файл.

import { supabase } from "../lib/supabaseClient";

export function ratingTag(c) {
  if (c.last_visit?.includes("месяц") || c.last_visit?.includes("год")) {
    return { label: "Редкий клиент", tone: "clay" };
  }
  if (c.visits >= 10 && c.cancellations === 0) {
    return { label: "Постоянный клиент", tone: "moss" };
  }
  if (c.visits <= 2) {
    return { label: "Новый клиент", tone: "clay" };
  }
  return { label: "Обычный клиент", tone: "soft" };
}

async function getVisitCounts(clientIds) {
  if (!clientIds?.length) return {};
  const { data, error } = await supabase
    .from("appointments")
    .select("client_id, date, status")
    .in("client_id", clientIds)
    .lte("date", new Date().toISOString().slice(0, 10));
  if (error) throw error;
  return (data || []).reduce((acc, a) => {
    if (a.status !== "cancelled") acc[a.client_id] = (acc[a.client_id] || 0) + 1;
    return acc;
  }, {});
}

export async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  const counts = await getVisitCounts((data || []).map((c) => c.id));
  return (data || []).map((c) => ({ ...c, visits: counts[c.id] || 0 }));
}

export async function getClientById(id) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const counts = await getVisitCounts([data.id]);
  return { ...data, visits: counts[data.id] || 0 };
}

export async function getHistory(clientId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, date, price, services(name, color)")
    .eq("client_id", clientId)
    .eq("status", "done")
    .order("date", { ascending: false });
  if (error) throw error;
  return data.map((a) => ({ id: a.id, date: a.date, price: a.price, service: a.services?.name, color: a.services?.color }));
}

export async function getPayments(clientId) {
  const { data, error } = await supabase
    .from("client_payments")
    .select("*")
    .eq("client_id", clientId)
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getNotes(clientId) {
  const { data, error } = await supabase
    .from("client_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addNote(clientId, text) {
  const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const { data, error } = await supabase
    .from("client_notes")
    .insert({ client_id: clientId, date, text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRecommendation(clientId) {
  const { data, error } = await supabase
    .from("client_recommendations")
    .select("text")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data?.text || "Рекомендаций пока нет — появятся после первых сессий.";
}

function initialsFromName(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

const PALETTE = ["#7C9A86", "#B98572", "#9C8FB0", "#C6A15B", "#6B8CAE"];

export async function createClient({ name, phone }) {
  const payload = {
    name: name.trim(),
    phone: phone?.trim() || "",
    initials: initialsFromName(name),
    visits: 0,
    cancellations: 0,
    avg_check: 0,
    last_visit: "Нет визитов",
    favorite_service: "",
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  };
  const { data, error } = await supabase.from("clients").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
