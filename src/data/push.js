import { supabase } from "../lib/supabaseClient";

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function getPublicKey() {
  const { data, error } = await supabase.functions.invoke("push-config", { method: "GET" });
  if (error) throw error;
  if (!data?.publicKey) throw new Error("Push notifications are not configured");
  return data.publicKey;
}

export async function subscribeToPush(userId) {
  if (!userId || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser");
  }

  const registration = await navigator.serviceWorker.ready;
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted");

  const publicKey = await getPublicKey();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
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

export async function disablePush(userId) {
  if (!userId || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw error;
}
