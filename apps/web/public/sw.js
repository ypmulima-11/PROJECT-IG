const CACHE_NAME = "project-ig-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/brand.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("project-ig-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/")) return;

  event.respondWith(caches.match(request).then(async (cached) => {
    try {
      const fresh = await fetch(request);
      if (fresh.ok && fresh.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      if (cached) return cached;
      if (request.mode === "navigate") return (await caches.match("/")) ?? Response.error();
      return Response.error();
    }
  }));
});
