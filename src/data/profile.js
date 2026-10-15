import { supabase } from "../lib/supabaseClient";
import { cacheResource, getCachedResource } from "./offlineStore";

function withReadTimeout(promise, ms = 5000) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("offline read timeout")), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function minutes(value) {
  const [h, m] = String(value || "00:00").split(":").map(Number);
  return h * 60 + m;
}

function time(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function normalizeWorkingHours(value) {
  if (Array.isArray(value)) return { weekly: value, dates: {} };
  return { weekly: value?.weekly || [], dates: value?.dates || {} };
}

// Если на дату, которая по графику является выходным, уже создана запись,
// считаем этот день фактически рабочим. Часы берём именно из записей.
async function applyAppointmentWorkHours(profile) {
  if (!profile) return profile;
  const schedule = normalizeWorkingHours(profile.working_hours);
  const { data, error } = await supabase
    .from("appointments")
    .select("date,start_time,duration,status")
    .neq("status", "cancelled");
  if (error) return profile;

  const byDate = {};
  for (const appointment of data || []) {
    if (!appointment.date) continue;
    const start = minutes(appointment.start_time);
    const end = start + Number(appointment.duration || 0);
    if (!byDate[appointment.date]) byDate[appointment.date] = { start, end };
    else {
      byDate[appointment.date].start = Math.min(byDate[appointment.date].start, start);
      byDate[appointment.date].end = Math.max(byDate[appointment.date].end, end);
    }
  }

  const dates = { ...schedule.dates };
  Object.entries(byDate).forEach(([key, range]) => {
    const configured = dates[key];
    if (configured?.on) return;
    dates[key] = {
      ...(configured || {}),
      on: true,
      start: time(range.start),
      end: time(range.end),
      breakStart: configured?.breakStart ?? null,
      breakEnd: configured?.breakEnd ?? null,
      fromAppointment: true,
    };
  });

  return { ...profile, working_hours: { ...schedule, dates } };
}

export async function getProfile(userId) {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
    const { data, error } = await withReadTimeout(supabase.from("profiles").select("*").eq("id", userId).maybeSingle());
    if (error) throw error;
    const result = await withReadTimeout(applyAppointmentWorkHours(data));
    if (result) cacheResource(userId, "profile", result);
    return result;
  } catch (error) {
    const cached = getCachedResource(userId, "profile", null);
    if (cached) return cached;
    throw error;
  }
}

export async function updateProfile(userId, fields) {
  const { data, error } = await supabase.from("profiles").update(fields).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

const AVATAR_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function uploadAvatar(userId, file) {
  if (!userId) throw new Error("Не удалось определить пользователя");
  if (!file) throw new Error("Выберите изображение");
  const ext = AVATAR_TYPES.get(String(file.type || "").toLowerCase());
  if (!ext) throw new Error("Поддерживаются JPG, PNG, WEBP, HEIC и HEIF");
  if (Number(file.size || 0) > MAX_AVATAR_BYTES) throw new Error("Размер фото должен быть не больше 5 МБ");

  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
