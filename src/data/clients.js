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

function todayLocal() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

async function getAppointmentStats(clientIds) {
  if (!clientIds?.length) return {};
  const today = todayLocal();
  const { data, error } = await supabase.from("appointments").select("id, client_id, date, price, status").in("client_id", clientIds).lte("date", today);
  if (error) throw error;
  const stats = {};
  for (const id of clientIds) stats[id] = { visits: 0, cancellations: 0, total: 0, lastVisit: null };
  for (const a of data || []) {
    const s = stats[a.client_id] || (stats[a.client_id] = { visits: 0, cancellations: 0, total: 0, lastVisit: null });
    if (a.status === "cancelled") { s.cancellations += 1; continue; }
    if (a.status !== "done") continue;
    s.visits += 1;
    s.total += Number(a.price || 0);
    if (!s.lastVisit || a.date > s.lastVisit) s.lastVisit = a.date;
  }
  return stats;
}

async function getNextVisits(clientIds) {
  if (!clientIds?.length) return {};
  const today = todayLocal();
  // В appointments используется именно start_time. Старого поля start здесь нет.
  const { data, error } = await supabase
    .from("appointments")
    .select("id, client_id, date, start_time, status")
    .in("client_id", clientIds)
    .gte("date", today)
    .neq("status", "cancelled")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) return {};
  const next = {};
  for (const a of data || []) {
    if (!next[a.client_id]) next[a.client_id] = { date: a.date, time: a.start_time || "" };
  }
  return next;
}

function withStats(client, stats, nextVisits) {
  const s = stats?.[client.id] || { visits: 0, cancellations: 0, total: 0, lastVisit: null };
  const next = nextVisits?.[client.id];
  return {
    ...client,
    visits: s.visits,
    cancellations: s.cancellations,
    avg_check: s.visits ? Math.round(s.total / s.visits) : 0,
    last_visit: formatDate(s.lastVisit),
    total_spent: s.total,
    next_visit: next ? `${formatDate(next.date)}${next.time ? `, ${next.time}` : ""}` : "Нет записи",
  };
}

export async function getClients() {
  const { data, error } = await supabase.from("clients").select("*").order("id", { ascending: true });
  if (error) throw error;
  const ids = (data || []).map((c) => c.id);
  const [stats, nextVisits] = await Promise.all([getAppointmentStats(ids), getNextVisits(ids)]);
  return (data || []).map((c) => withStats(c, stats, nextVisits));
}

export async function getClientById(id) {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [stats, nextVisits] = await Promise.all([getAppointmentStats([data.id]), getNextVisits([data.id])]);
  return withStats(data, stats, nextVisits);
}

export async function getHistory(clientId) {
  const { data, error } = await supabase.from("appointments").select("id, date, price, status, services(name, color)").eq("client_id", clientId).neq("status", "cancelled").order("date", { ascending: false });
  if (error) throw error;

  const appointments = data || [];
  if (!appointments.length) return [];

  const appointmentIds = appointments.map((a) => a.id);
  const { data: extraServices, error: servicesError } = await supabase
    .from("appointment_services")
    .select("id, appointment_id, service_id, duration, price, services(id, name, color, duration, price)")
    .in("appointment_id", appointmentIds)
    .order("id", { ascending: true });
  if (servicesError) throw servicesError;

  const servicesByAppointment = {};
  for (const row of extraServices || []) {
    if (!servicesByAppointment[row.appointment_id]) servicesByAppointment[row.appointment_id] = [];
    if (row.services) servicesByAppointment[row.appointment_id].push({
      id: row.service_id,
      name: row.services.name,
      color: row.services.color,
      duration: Number(row.duration || row.services.duration || 0),
      price: Number(row.price ?? row.services.price ?? 0),
    });
  }

  return appointments.map((a) => {
    const services = servicesByAppointment[a.id];
    const fallback = a.services ? [{
      id: a.services.id,
      name: a.services.name,
      color: a.services.color,
      duration: Number(a.services.duration || 0),
      price: Number(a.services.price || a.price || 0),
    }] : [{ id: null, name: "Услуга", color: undefined, duration: 0, price: Number(a.price || 0) }];
    const allServices = services?.length ? services : fallback;

    return {
      id: a.id,
      date: formatDate(a.date),
      price: Number(a.price || 0),
      service: allServices.map((s) => s.name).join(" · "),
      services: allServices,
      color: allServices[0]?.color,
    };
  });
}

export async function getPayments(clientId) {
  const { data, error } = await supabase.from("client_payments").select("*").eq("client_id", clientId).order("id", { ascending: false });
  if (error) throw error;
  const payments = data || [];
  if (!payments.length) return [];

  // Оплата будущей/непроведённой записи не считается уже оплаченной услугой.
  // Если платёж привязан к записи, учитываем его только когда эта запись завершена.
  const appointmentIds = [...new Set(payments.map((p) => p.appointment_id).filter(Boolean))];
  if (!appointmentIds.length) return payments;
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("id, status, date")
    .in("id", appointmentIds);
  if (appointmentsError) return payments;
  const validIds = new Set((appointments || []).filter((a) => a.status === "done").map((a) => a.id));
  return payments.filter((p) => !p.appointment_id || validIds.has(p.appointment_id));
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
