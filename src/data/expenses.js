import { supabase } from "../lib/supabaseClient";
import { fmtDate } from "./appointments";

export async function getExpensesRange(startDate, endDate) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("date", fmtDate(startDate))
    .lte("date", fmtDate(endDate))
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createExpense({ title, subtitle, amount, date }) {
  const { data, error } = await supabase
    .from("expenses")
    .insert({ title, subtitle, amount, date: date || fmtDate(new Date()) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}
