import { supabase } from "../lib/supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(userId) {
  if (!userId || !VAPID_PUBLIC_KEY) throw new Error("VAPID public key is not configured");
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Push notifications are not supported");

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission denied");

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: navigator.userAgent,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) throw error;
  return subscription;
}

export async function unsubscribeFromPush(userId) {
  if (!userId) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase.from("push_subscriptions").update({ enabled: false, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("endpoint", endpoint);
  if (error) throw error;
}
