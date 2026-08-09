// Слой доступа к данным о клиентах — теперь реальная база (Supabase)
// вместо моков. Экраны используют эти функции, не обращаясь к supabase
// напрямую — если бэкенд когда-то сменится, менять придётся только этот файл.

import { supabase } from "../lib/supabaseClient";

// Рейтинг — не оценка "хороший/плохой", а полезная информация
// для построения отношений с клиентом.
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

export async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getClientById(id) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getHistory(clientId) {
  const { data, error } = await supabase
    .from("client_history")
    .select("*")
    .eq("client_id", clientId)
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
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
