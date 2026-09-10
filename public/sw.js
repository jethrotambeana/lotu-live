// Minimal service worker — exists primarily to satisfy PWA installability
// criteria (Chrome/Android require a registered service worker with a
// fetch handler before offering the install prompt). Deliberately does
// NOT cache page content: this site's whole value is showing what's live
// right now, so aggressively caching pages risks showing stale "LIVE"
// status or outdated schedules, which would undermine the platform's
// actual purpose. Only the app icons get a light cache-first treatment,
// since they basically never change — everything else (pages, data,
// external provider embeds/images) passes straight through to the
// network exactly as if there were no service worker at all.

const STATIC_CACHE = 'lotu-static-v1';
const STATIC_ASSETS = ['/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
  // Everything else: no event.respondWith() call at all, so the browser
  // handles the request completely normally, as if unintercepted.
});
