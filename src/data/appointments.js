// Слой доступа к данным о записях — связывает клиентов и услуги в расписание.

import { supabase } from "../lib/supabaseClient";

export function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const SELECT = "*, clients(id,name,phone,color), services(id,name,color,duration,price)";

export async function getAppointmentsRange(startDate, endDate) {
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT)
    .gte("date", fmtDate(startDate))
    .lte("date", fmtDate(endDate))
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAppointmentById(id) {
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAppointment(payload) {
  const { data, error } = await supabase.from("appointments").insert(payload).select(SELECT).single();
  if (error) throw error;
  return data;
}

export async function updateAppointment(id, fields) {
  const { data, error } = await supabase.from("appointments").update(fields).eq("id", id).select(SELECT).single();
  if (error) throw error;
  return data;
}
