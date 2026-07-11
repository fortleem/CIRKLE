// Cirkle (دواير) — Service Worker for Push Notifications
// Handles emergency news alerts and breaking news notifications

const CACHE_NAME = "cirkle-news-v1";
const OFFLINE_URLS = ["/", "/api/news/categories"];

// Install — pre-cache essential routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notification handler
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Cirkle Alert", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Cirkle News";
  const options = {
    body: data.body || data.summary || "New update available",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || "cirkle-news",
    data: {
      url: data.url || data.sourceUrl || "/",
      category: data.category || "breaking",
    },
    requireInteraction: data.isEmergency || false,
    silent: false,
    vibrate: data.isEmergency ? [200, 100, 200, 100, 200] : [100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open the article URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Fetch handler — offline caching for news API
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Cache news API responses for offline use
  if (request.url.includes("/api/news/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // Offline — try cache
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: "Offline", items: [] }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }
      })
    );
  }
});

// Message handler — receive push subscription from page
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, url, isEmergency } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        tag: isEmergency ? "cirkle-emergency" : "cirkle-news",
        data: { url: url || "/" },
        requireInteraction: isEmergency || false,
        vibrate: isEmergency ? [200, 100, 200, 100, 200] : [100],
      })
    );
  }
});
