import { supabase } from "../lib/supabaseClient";

export async function getClientBalance(clientId) {
  if (!clientId) return 0;
  const { data, error } = await supabase
    .from("client_balance_transactions")
    .select("amount")
    .eq("client_id", clientId);
  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export async function getClientBalanceTransactions(clientId) {
  if (!clientId) return [];
  const { data, error } = await supabase
    .from("client_balance_transactions")
    .select("id,client_id,appointment_id,amount,kind,method,note,created_at")
    .eq("client_id", clientId)
    .order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addClientBalanceAdjustment(clientId, amount, note = "Ручная корректировка") {
  const value = Math.round(Number(amount) || 0);
  if (!clientId || value === 0) throw new Error("Укажите сумму корректировки");
  const { data, error } = await supabase
    .from("client_balance_transactions")
    .insert({ client_id: clientId, amount: value, kind: "adjustment", note })
    .select()
    .single();
  if (error) throw error;
  return data;
}
