import { supabase } from "../lib/supabaseClient";

export async function getSupportRequests() {
  const { data, error } = await supabase
    .from("support_requests")
    .select("id, topic, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function createSupportRequest({ ownerId, topic, message }) {
  const { data, error } = await supabase
    .from("support_requests")
    .insert({ owner_id: ownerId, topic, message: message.trim() })
    .select("id, topic, message, status, created_at")
    .single();

  if (error) throw error;
  return data;
}
