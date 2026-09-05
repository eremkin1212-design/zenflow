import { supabase } from "../lib/supabaseClient";

const REQUEST_FIELDS = "id, owner_id, requester_email, topic, message, status, created_at, updated_at, last_message_at";

async function notifySupportTelegram(requestId, messageId = null) {
  try {
    const body = { requestId };
    if (messageId) body.messageId = messageId;

    const { error } = await supabase.functions.invoke("notify-support-telegram", { body });
    if (error) throw error;
  } catch (error) {
    console.warn("Telegram support notification was not delivered", error);
  }
}

export async function getSupportRequests() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const ownerId = authData?.user?.id;
  if (!ownerId) return [];

  const { data, error } = await supabase
    .from("support_requests")
    .select(REQUEST_FIELDS)
    .eq("owner_id", ownerId)
    .order("last_message_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return data || [];
}

export async function createSupportRequest({ ownerId, email, topic, message }) {
  const { data, error } = await supabase
    .from("support_requests")
    .insert({ owner_id: ownerId, requester_email: email || null, topic, message: message.trim() })
    .select(REQUEST_FIELDS)
    .single();

  if (error) throw error;
  void notifySupportTelegram(data.id);
  return data;
}

export async function getSupportRequest(id) {
  const { data, error } = await supabase
    .from("support_requests")
    .select(REQUEST_FIELDS)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getSupportMessages(requestId) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("id, request_id, sender_user_id, sender_type, message, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendCustomerReply({ requestId, userId, message }) {
  const { data, error } = await supabase
    .from("support_messages")
    .insert({ request_id: requestId, sender_user_id: userId, sender_type: "customer", message: message.trim() })
    .select("id, request_id, sender_user_id, sender_type, message, created_at")
    .single();

  if (error) throw error;
  void notifySupportTelegram(requestId, data.id);
  return data;
}

export async function resolveOwnSupportRequest(requestId) {
  const { data, error } = await supabase.functions.invoke("resolve-support-request", {
    body: { requestId },
  });
  if (error) throw error;
  if (!data?.request) throw new Error("Не удалось завершить обращение");
  return data.request;
}

export async function isSupportAgent(userId) {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("support_agents")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

export async function getAllSupportRequests() {
  const { data, error } = await supabase
    .from("support_requests")
    .select(REQUEST_FIELDS)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

export async function sendSupportReply({ requestId, userId, message }) {
  const { data, error } = await supabase
    .from("support_messages")
    .insert({ request_id: requestId, sender_user_id: userId, sender_type: "support", message: message.trim() })
    .select("id, request_id, sender_user_id, sender_type, message, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updateSupportStatus(requestId, status) {
  const { data, error } = await supabase
    .from("support_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .select(REQUEST_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

export async function getSupportTelegramStatus() {
  const { data, error } = await supabase.functions.invoke("configure-support-telegram", {
    body: { action: "status" },
  });
  if (error) throw error;
  return data || { connected: false };
}

export async function connectSupportTelegram(token) {
  const { data, error } = await supabase.functions.invoke("configure-support-telegram", {
    body: { action: "connect", token: token.trim() },
  });
  if (error) throw error;
  return data;
}

export function subscribeSupportConversation(requestId, { onMessage, onRequest } = {}) {
  const channel = supabase
    .channel(`support-conversation-${requestId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "support_messages", filter: `request_id=eq.${requestId}` },
      (payload) => onMessage?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "support_requests", filter: `id=eq.${requestId}` },
      (payload) => onRequest?.(payload.new)
    )
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}

export function subscribeSupportInbox(onChange) {
  const channel = supabase
    .channel("support-inbox")
    .on("postgres_changes", { event: "*", schema: "public", table: "support_requests" }, () => onChange?.())
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => onChange?.())
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}
