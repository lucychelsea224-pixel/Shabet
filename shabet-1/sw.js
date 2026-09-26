// Shabet service worker.
//
// Bump CACHE_NAME whenever you want to force a clean cache (old caches
// are deleted on activate either way) — it no longer has to be bumped
// just to make a deploy visible, see the fetch handler below.
const CACHE_NAME = 'shabet-shell-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/data.js',
  './js/store.js',
  './js/supabaseClient.js',
  './js/auth.js',
  './js/receipt.js',
  './js/agent.js',
  './js/admin.js',
  './js/app.js',
  './js/domFocus.js',
  './icons/icon-mask.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/logo-full.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// APP_SHELL entries are what used to go stale forever under a cache-first
// strategy: once shabet-shell-v1 was cached, a fresh deploy of index.html
// or any js/ file was invisible until CACHE_NAME itself changed — which
// is exactly why refreshing over and over sometimes "eventually" worked
// (a later deploy happened to bump it) and sometimes didn't.
//
// Fix: treat the app shell as network-first. Always try the network for
// the latest copy of these files first; only fall back to the cached
// copy if the device is offline. This means a deploy shows up on the
// very next load, with no manual cache-busting needed, while the app
// still works offline from whatever was last successfully fetched.
function isAppShellRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) return true;
  return APP_SHELL.some((path) => path !== './' && url.pathname.endsWith(path.slice(1)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (isAppShellRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Everything else (icons, and anything not in the shell, e.g. a future
  // Supabase API call) — cache-first as before, these don't change on
  // deploy the way the app shell does.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && new URL(request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
