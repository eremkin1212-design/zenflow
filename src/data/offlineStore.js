const PREFIX = "ritena-offline-v1";

function key(ownerId, name) {
  return `${PREFIX}:${ownerId || "anonymous"}:${name}`;
}

function readJson(storageKey, fallback) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storageKey, value) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function emit(name = "ritena:offline-change") {
  try { window.dispatchEvent(new CustomEvent(name)); } catch {}
}

export function makeOfflineId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function cacheResource(ownerId, name, value) {
  if (!ownerId) return;
  writeJson(key(ownerId, `cache:${name}`), {
    savedAt: Date.now(),
    value,
  });
}

export function getCachedResource(ownerId, name, fallback = null) {
  if (!ownerId) return fallback;
  const stored = readJson(key(ownerId, `cache:${name}`), null);
  return stored?.value ?? fallback;
}

export function getPendingAppointments(ownerId) {
  if (!ownerId) return [];
  const list = readJson(key(ownerId, "pending-appointments"), []);
  return Array.isArray(list) ? list : [];
}

export function queuePendingAppointment(ownerId, item) {
  if (!ownerId || !item?.offlineId) return;
  const list = getPendingAppointments(ownerId);
  const next = [...list.filter((x) => x.offlineId !== item.offlineId), {
    ...item,
    queuedAt: item.queuedAt || new Date().toISOString(),
  }];
  writeJson(key(ownerId, "pending-appointments"), next);
  emit();
}

export function removePendingAppointment(ownerId, offlineId) {
  if (!ownerId || !offlineId) return;
  const next = getPendingAppointments(ownerId).filter((x) => x.offlineId !== offlineId);
  writeJson(key(ownerId, "pending-appointments"), next);
  emit();
}

export function cacheAppointments(ownerId, appointments) {
  if (!ownerId || !Array.isArray(appointments)) return;
  const current = getCachedResource(ownerId, "appointments", []);
  const map = new Map();
  for (const a of Array.isArray(current) ? current : []) {
    if (a?.id != null) map.set(String(a.id), a);
  }
  for (const a of appointments) {
    if (a?.id != null) map.set(String(a.id), a);
  }
  const merged = [...map.values()]
    .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")))
    .slice(0, 500);
  cacheResource(ownerId, "appointments", merged);
}

export function getCachedAppointmentsRange(ownerId, startKey, endKey) {
  const cached = getCachedResource(ownerId, "appointments", []);
  return (Array.isArray(cached) ? cached : []).filter((a) => {
    const d = String(a?.date || "");
    return d >= startKey && d <= endKey;
  });
}

export function pendingToAppointment(item) {
  const payload = item?.payload || {};
  const services = Array.isArray(item?.services) ? item.services : [];
  const client = item?.client || null;
  return {
    ...payload,
    id: `offline:${item.offlineId}`,
    offline_id: item.offlineId,
    _offline: true,
    _sync_status: "pending",
    clients: client ? {
      id: client.id,
      name: client.name,
      phone: client.phone || "",
      color: client.color,
      highlights: client.highlights || "",
    } : null,
    services: services[0] ? {
      id: services[0].id ?? services[0].service_id,
      name: services[0].name || "Услуга",
      color: services[0].color,
      duration: Number(services[0].duration || 0),
      price: Number(services[0].price || 0),
    } : null,
    appointment_services: services.map((s, i) => ({
      id: `offline-service:${item.offlineId}:${i}`,
      appointment_id: `offline:${item.offlineId}`,
      service_id: s.id ?? s.service_id,
      duration: Number(s.duration || 0),
      price: Number(s.price || 0),
      services: {
        id: s.id ?? s.service_id,
        name: s.name || "Услуга",
        color: s.color,
        duration: Number(s.duration || 0),
        price: Number(s.price || 0),
      },
    })),
  };
}

export function getPendingAppointmentsRange(ownerId, startKey, endKey) {
  return getPendingAppointments(ownerId)
    .map(pendingToAppointment)
    .filter((a) => a.date >= startKey && a.date <= endKey);
}

export function emitAppointmentsSynced() {
  emit("ritena:appointments-synced");
}
