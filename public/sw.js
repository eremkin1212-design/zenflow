// RITENA service worker.
// Кэширует оболочку приложения для офлайн-работы и принимает push-уведомления.

const VERSION = "ritena-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      try {
        const shell = await fetch("/", { cache: "no-store" });
        if (shell.ok) {
          await cache.put("/", shell.clone());
          const html = await shell.text();
          const paths = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
            .map((m) => m[1])
            .filter((value) => value && !value.startsWith("data:"))
            .map((value) => new URL(value, self.location.origin))
            .filter((url) => url.origin === self.location.origin && url.pathname !== "/sw.js")
            .map((url) => url.pathname + url.search);
          await Promise.all([...new Set(paths)].map((asset) => cache.add(asset).catch(() => {})));
        }
        await Promise.all([
          "/manifest.webmanifest",
          "/icon-192.png",
          "/icon-512.png",
          "/apple-touch-icon.png",
        ].map((asset) => cache.add(asset).catch(() => {})));
      } catch {}
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  // Навигация: сначала свежая версия, при отсутствии сети — сохранённая оболочка.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(VERSION);
            await cache.put("/", fresh.clone());
          }
          return fresh;
        } catch {
          const cache = await caches.open(VERSION);
          const cached = await cache.match("/");
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Статические файлы Vite (JS/CSS/иконки/шрифты) сохраняем после первого
  // успешного открытия. Это позволяет повторно открыть RITENA без интернета.
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);

      if (cached) {
        event.waitUntil(
          fetch(req)
            .then(async (fresh) => {
              if (fresh.ok) await cache.put(req, fresh.clone());
            })
            .catch(() => {})
        );
        return cached;
      }

      try {
        const fresh = await fetch(req);
        if (fresh.ok) await cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return Response.error();
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
