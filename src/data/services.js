// Слой доступа к данным об услугах — реальная база вместо моков.

import { supabase } from "../lib/supabaseClient";

export async function getServices() {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createService({ name, color, duration, price }) {
  const { data, error } = await supabase
    .from("services")
    .insert({ name, color, duration, price })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteService(id) {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}
