import { supabase } from "../lib/supabaseClient";

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

export async function getClientsDueForVisit(clientIds) {
  if (!clientIds?.length) return {};
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("appointments")
    .select("client_id, date, status")
    .in("client_id", clientIds)
    .lte("date", today)
    .neq("status", "cancelled")
    .order("date", { ascending: true });
  if (error) throw error;

  const byClient = {};
  for (const a of data || []) (byClient[a.client_id] ||= []).push(a.date);

  const result = {};
  for (const id of clientIds) {
    const dates = [...new Set(byClient[id] || [])].sort();
    if (dates.length < 2) continue;
    const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d)).filter((n) => n > 0);
    if (!gaps.length) continue;
    const interval = Math.max(7, Math.round(gaps.reduce((s, n) => s + n, 0) / gaps.length));
    const lastVisit = dates[dates.length - 1];
    const elapsed = daysBetween(lastVisit, today);
    if (elapsed >= Math.max(10, interval - 1)) result[id] = { interval, elapsed, overdue: elapsed >= interval, lastVisit };
  }
  return result;
}
