// App-shell service worker: makes the installed app open instantly on
// repeat visits and survive a dropped connection for the shell itself.
// Deliberately does NOT cache API calls (Supabase, OSRM, Nominatim, map
// tiles) or anything cross-origin — this app is live/social data, not a
// document viewer, so only the static build output is ever cached.
const STATIC_CACHE = 'nightly-static-v1';
const PAGE_CACHE = 'nightly-page-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Expo's web build fingerprints every JS/asset filename with a content
  // hash, so these are safe to cache forever — a new deploy produces new
  // URLs instead of mutating these ones.
  if (url.pathname.startsWith('/_expo/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
        )
      )
    );
    return;
  }

  // The app shell itself (index.html / any client-side route navigation):
  // network-first, since a stale cached copy would point at a previous
  // deploy's now-gone hashed bundle filenames. Only falls back to the last
  // good cached shell when there's genuinely no connection.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.open(PAGE_CACHE).then((cache) => cache.match('/')))
    );
  }
});
