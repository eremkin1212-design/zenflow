// RITENA service worker.
// Отвечает за две вещи: приложение открывается с домашнего экрана
// и принимает пуш-уведомления, когда приложение закрыто.

const VERSION = "ritena-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Чистим кэши прошлых версий, чтобы после деплоя не отдавался старый код.
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// Сеть в приоритете: приложение всегда свежее, кэш — только запасной вариант
// для навигации, если интернет пропал.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put("/", fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(VERSION);
        const cached = await cache.match("/");
        return cached || Response.error();
      }
    })()
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "RITENA", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "RITENA";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = all.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) await existing.navigate(target);
        return;
      }
      await self.clients.openWindow(target);
    })()
  );
});
