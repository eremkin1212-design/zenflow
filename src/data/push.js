import { supabase } from "../lib/supabaseClient";

// Публичный VAPID-ключ. Должен совпадать с ключом в таблице push_config,
// которым отправщик подписывает уведомления — иначе Apple/Google их отбросят.
const VAPID_PUBLIC_KEY = "BF1gdWx3Mjo9H2eONkxSckVHkL_R2PzjI_fCmx1h9bdKXBiRfVPC_5dzibLQv0yaxWqpIWCZa_VbifViENYQDrw";

function urlBase64ToUint8Array(base64String) {
const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
const raw = atob(base64);
const out = new Uint8Array(raw.length);
for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
return out;
}

export function pushSupported() {
return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// iOS присылает пуши только приложению, установленному на домашний экран.
export function isStandalone() {
if (typeof window === "undefined") return false;
return window.matchMedia?.("(display-mode: standalone)").matches === true || window.navigator.standalone === true;
}

export function isIOS() {
if (typeof navigator === "undefined") return false;
return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export async function getPushState() {
if (!pushSupported()) return { supported: false, permission: "unsupported", subscribed: false };
const reg = await navigator.serviceWorker.getRegistration();
const sub = reg ? await reg.pushManager.getSubscription() : null;
return { supported: true, permission: Notification.permission, subscribed: Boolean(sub) };
}

export async function enablePush() {
if (!pushSupported()) throw new Error("unsupported");

const permission = await Notification.requestPermission();
if (permission !== "granted") throw new Error("denied");

const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error("no-user");

const reg = await navigator.serviceWorker.ready;
let sub = await reg.pushManager.getSubscription();

// Если телефон подписан старым ключом — пересоздаём подписку,
// иначе уведомления не будут доставляться.
if (sub) {
const current = sub.options?.applicationServerKey;
const expected = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
const same = current && new Uint8Array(current).length === expected.length &&
new Uint8Array(current).every((b, i) => b === expected[i]);
if (!same) {
try { await sub.unsubscribe(); } catch { /* уже отписан */ }
sub = null;
}
}

if (!sub) {
sub = await reg.pushManager.subscribe({
userVisibleOnly: true,
applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
});
}

const json = sub.toJSON();

// Схема таблицы: user_id, endpoint, p256dh, auth, user_agent, enabled.
// Сначала убираем прежнюю запись с тем же endpoint, потом вставляем свежую.
await supabase.from("push_subscriptions").delete().eq("endpoint", json.endpoint);

const { error } = await supabase.from("push_subscriptions").insert({
user_id: user.id,
endpoint: json.endpoint,
p256dh: json.keys.p256dh,
auth: json.keys.auth,
user_agent: navigator.userAgent,
enabled: true,
});
if (error) throw error;

return true;
}

export async function disablePush() {
const reg = await navigator.serviceWorker.getRegistration();
const sub = reg ? await reg.pushManager.getSubscription() : null;
if (sub) {
const endpoint = sub.endpoint;
try { await sub.unsubscribe(); } catch { /* уже отписан */ }
await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
return true;
}

// Сколько устройств этого специалиста подписано (для подсказки в интерфейсе).
export async function countSubscriptions() {
const { count, error } = await supabase
.from("push_subscriptions")
.select("id", { count: "exact", head: true })
.eq("enabled", true);
if (error) return null;
return count ?? null;
}
