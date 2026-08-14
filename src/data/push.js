import { supabase } from "../lib/supabaseClient";

// Публичный VAPID-ключ. Приватная половина живёт только в секретах Supabase.
const VAPID_PUBLIC_KEY = "BALmMzLyt9znLkWoJeMUG_uwTHEaANUVyJgO9yZP_Q5CO1ZhqkeieEd3CAPy8A3GvRNMXxa5GG-ENaabSKNKz60";

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

const reg = await navigator.serviceWorker.ready;
let sub = await reg.pushManager.getSubscription();
if (!sub) {
sub = await reg.pushManager.subscribe({
userVisibleOnly: true,
applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
});
}

const json = sub.toJSON();
const { error } = await supabase.from("push_subscriptions").upsert(
{
endpoint: json.endpoint,
p256dh: json.keys.p256dh,
auth: json.keys.auth,
user_agent: navigator.userAgent,
},
{ onConflict: "endpoint" }
);
if (error) throw error;
return true;
}

export async function disablePush() {
const reg = await navigator.serviceWorker.getRegistration();
const sub = reg ? await reg.pushManager.getSubscription() : null;
if (sub) {
const endpoint = sub.endpoint;
await sub.unsubscribe();
await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
return true;
}

// Просит сервер прислать тестовое уведомление на это устройство.
export async function sendTestPush() {
const { data, error } = await supabase.functions.invoke("send-reminders", { body: { test: true } });
if (error) throw error;
return data;
}
