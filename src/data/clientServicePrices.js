import { supabase } from "../lib/supabaseClient";
import { cacheResource, getCachedResource } from "./offlineStore";

function cacheKey(clientId) {
  return `client-service-prices:${clientId}`;
}

async function currentOwnerId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

export async function getClientServicePrices(clientId) {
  if (!clientId) return {};
  const ownerId = await currentOwnerId();
  const cached = ownerId ? getCachedResource(ownerId, cacheKey(clientId), {}) : {};

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return cached && typeof cached === "object" ? cached : {};
  }

  try {
    const { data, error } = await supabase
      .from("client_service_prices")
      .select("service_id,price,updated_at")
      .eq("client_id", clientId);
    if (error) throw error;

    const map = {};
    for (const row of data || []) map[String(row.service_id)] = Number(row.price || 0);
    if (ownerId) cacheResource(ownerId, cacheKey(clientId), map);
    return map;
  } catch (error) {
    if (cached && typeof cached === "object") return cached;
    throw error;
  }
}

export async function setClientServicePrice(clientId, serviceId, price) {
  const ownerId = await currentOwnerId();
  if (!ownerId) throw new Error("Сессия пользователя недоступна");
  const value = Math.max(0, Math.round(Number(price) || 0));

  const { data, error } = await supabase
    .from("client_service_prices")
    .upsert(
      {
        owner_id: ownerId,
        client_id: clientId,
        service_id: serviceId,
        price: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,client_id,service_id" }
    )
    .select("service_id,price,updated_at")
    .single();
  if (error) throw error;

  const cached = getCachedResource(ownerId, cacheKey(clientId), {});
  cacheResource(ownerId, cacheKey(clientId), {
    ...(cached && typeof cached === "object" ? cached : {}),
    [String(serviceId)]: value,
  });
  return data;
}

export async function clearClientServicePrice(clientId, serviceId) {
  const ownerId = await currentOwnerId();
  if (!ownerId) throw new Error("Сессия пользователя недоступна");

  const { error } = await supabase
    .from("client_service_prices")
    .delete()
    .eq("client_id", clientId)
    .eq("service_id", serviceId);
  if (error) throw error;

  const cached = { ...(getCachedResource(ownerId, cacheKey(clientId), {}) || {}) };
  delete cached[String(serviceId)];
  cacheResource(ownerId, cacheKey(clientId), cached);
}
