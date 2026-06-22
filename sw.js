// MeadOS service worker — offline shell + installable PWA.
//
// Strategy (deliberately conservative so it never serves stale data or code):
//   • /api/*            → network ONLY. Never cached. Mead data, share tokens,
//                          health, security all must be live.
//   • navigations (HTML)→ network first; on failure fall back to cached
//                          index.html so the app opens offline.
//   • same-origin GET   → network first (the server's ETag makes an unchanged
//     (app.js, app.css,    app.js a cheap 304), falling back to cache offline.
//      icons, manifest)    Successful responses refresh the cache.
//   • cross-origin       → not intercepted (fonts/CDN use their own caching).
//
// Bump CACHE_VERSION to force old caches to be dropped on the next activate.
const CACHE_VERSION = 'meados-v1';
const SHELL = [
  '/index.html',
  '/app.css',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // only cache GETs
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // ignore cross-origin
  if (url.pathname.startsWith('/api/')) return;           // never touch the API

  // Navigations: network first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r || caches.match(req)))
    );
    return;
  }

  // Same-origin static assets: network first (ETag-cheap), cache fallback.
  event.respondWith(
    fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
