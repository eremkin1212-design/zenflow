// Слой доступа к данным об услугах — реальная база вместо моков.

import { supabase } from "../lib/supabaseClient";
import { cacheResource, getCachedResource } from "./offlineStore";

export async function getServices() {
  const { data: sessionData } = await supabase.auth.getSession();
  const ownerId = sessionData?.session?.user?.id || null;
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("id", { ascending: true });
    if (error) throw error;
    const result = data || [];
    if (ownerId) cacheResource(ownerId, "services", result);
    return result;
  } catch (error) {
    const cached = ownerId ? getCachedResource(ownerId, "services", null) : null;
    if (Array.isArray(cached)) return cached;
    throw error;
  }
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

export async function updateService(id, fields) {
  const { data, error } = await supabase.from("services").update(fields).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteService(id) {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}
