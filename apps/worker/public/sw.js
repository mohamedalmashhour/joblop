// Minimal service worker for JobLop — enables PWA installability (Add to Home Screen) and a basic
// offline fallback. Network-first for page navigations (always fresh), cache-first for static assets.
const CACHE = "joblop-v1";
const CORE = ["/", "/browse"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || caches.match("/"))));
    return;
  }
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
