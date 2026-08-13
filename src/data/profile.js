import { supabase } from "../lib/supabaseClient";

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
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return applyAppointmentWorkHours(data);
}

export async function updateProfile(userId, fields) {
  const { data, error } = await supabase.from("profiles").update(fields).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
