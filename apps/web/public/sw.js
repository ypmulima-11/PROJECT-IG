const CACHE_NAME = "project-ig-shell-v2";
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const APP_ROOT = `${BASE_PATH}/`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([APP_ROOT, `${APP_ROOT}manifest.webmanifest`, `${APP_ROOT}brand.svg`])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("project-ig-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith(`${APP_ROOT}api/`) || url.pathname.startsWith(`${APP_ROOT}socket.io/`)) return;

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
      if (request.mode === "navigate") return (await caches.match(APP_ROOT)) ?? Response.error();
      return Response.error();
    }
  }));
});

