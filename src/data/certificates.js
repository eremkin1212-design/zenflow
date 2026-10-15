import { supabase } from "../lib/supabaseClient";

export function normalizeCertificateNumber(value) {
  return String(value || "").trim().toUpperCase();
}

export function certificateDisplayStatus(certificate) {
  if (!certificate) return "unknown";
  if (certificate.status === "cancelled") return "cancelled";
  if (certificate.status === "used") return "used";
  if (certificate.expires_at) {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (certificate.expires_at < local) return "expired";
  }
  return "active";
}

const SELECT = "*, clients(id,name,phone), services(id,name,price,duration,color)";

export async function getCertificates() {
  const { data, error } = await supabase
    .from("certificates")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCertificateByNumber(number) {
  const normalized = normalizeCertificateNumber(number);
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("certificates")
    .select(SELECT)
    .eq("number", normalized)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCertificateRedemptions(certificateId) {
  if (!certificateId) return [];
  const { data, error } = await supabase
    .from("certificate_redemptions")
    .select("id,amount_used,sessions_used,topup_amount,topup_method,created_at,appointments(id,date,start_time,price,clients(name),services(name))")
    .eq("certificate_id", certificateId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCertificate({
  kind,
  clientId,
  serviceId,
  amount,
  sessions,
  expiresAt,
  note,
  salePrice,
  saleMethod,
}) {
  const normalizedKind = ["amount", "service", "sessions"].includes(kind) ? kind : "amount";
  const amountValue = normalizedKind === "amount" ? Math.max(0, Math.round(Number(amount) || 0)) : 0;
  const sessionsValue = normalizedKind === "service" ? 1 : normalizedKind === "sessions" ? Math.max(1, Math.round(Number(sessions) || 1)) : 0;

  if (normalizedKind === "amount" && amountValue <= 0) throw new Error("Укажи сумму сертификата");
  if (normalizedKind !== "amount" && !serviceId) throw new Error("Выбери услугу");

  const payload = {
    kind: normalizedKind,
    client_id: clientId || null,
    service_id: normalizedKind === "amount" ? null : serviceId,
    initial_amount: amountValue,
    remaining_amount: amountValue,
    initial_sessions: sessionsValue,
    remaining_sessions: sessionsValue,
    expires_at: expiresAt || null,
    note: String(note || "").trim() || null,
    sale_price: normalizedKind === "amount" ? amountValue : Math.max(0, Math.round(Number(salePrice) || 0)),
    sale_method: ["Наличные", "Карта", "Другое"].includes(saleMethod) ? saleMethod : "Наличные",
  };

  const { data, error } = await supabase
    .from("certificates")
    .insert(payload)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function cancelCertificate(id) {
  const { data, error } = await supabase
    .from("certificates")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function redeemCertificate({
  certificateNumber,
  appointmentId,
  serviceTotal,
  topupMethod = null,
}) {
  const { data, error } = await supabase.rpc("redeem_certificate_for_appointment", {
    p_certificate_number: normalizeCertificateNumber(certificateNumber),
    p_appointment_id: appointmentId,
    p_service_total: Math.max(0, Math.round(Number(serviceTotal) || 0)),
    p_topup_method: topupMethod || null,
  });
  if (error) throw error;
  return data;
}


function dateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export async function getCertificateFinanceRange(start, end, appointmentIds = []) {
  const from = dateKey(start);
  const to = dateKey(end);

  const salesQuery = supabase
    .from("certificates")
    .select("id,number,kind,sale_price,sale_method,sale_date,created_at,client_id,clients(id,name),services(id,name)")
    .gt("sale_price", 0)
    .gte("sale_date", from)
    .lte("sale_date", to)
    .order("sale_date", { ascending: true });

  const redemptionQuery = supabase
    .from("certificate_redemptions")
    .select("id,appointment_id,certificate_id,amount_used,sessions_used,topup_amount,topup_method,redemption_date,created_at,certificates(number,kind),appointments(id,start_time,client_id,clients(id,name),services(id,name))")
    .gte("redemption_date", from)
    .lte("redemption_date", to)
    .order("redemption_date", { ascending: true });

  const ids = [...new Set((appointmentIds || []).map(Number).filter(Number.isFinite))];
  const paidIdsQuery = ids.length
    ? supabase.from("certificate_redemptions").select("appointment_id").in("appointment_id", ids)
    : Promise.resolve({ data: [], error: null });

  const [salesResult, redemptionResult, paidIdsResult] = await Promise.all([
    salesQuery,
    redemptionQuery,
    paidIdsQuery,
  ]);

  if (salesResult.error) throw salesResult.error;
  if (redemptionResult.error) throw redemptionResult.error;
  if (paidIdsResult.error) throw paidIdsResult.error;

  return {
    sales: salesResult.data || [],
    redemptions: redemptionResult.data || [],
    certificatePaidAppointmentIds: [...new Set((paidIdsResult.data || []).map((row) => Number(row.appointment_id)))],
  };
}
