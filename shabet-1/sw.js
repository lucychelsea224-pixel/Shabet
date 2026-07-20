// Shabet service worker — cache-first app shell.
// Bump CACHE_NAME whenever any file in APP_SHELL changes so old clients
// pick up the new version instead of serving stale files forever.
const CACHE_NAME = 'shabet-shell-v1';

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

// Cache-first: app shell assets load instantly even on a dead connection.
// Anything not in the shell (e.g. a future Supabase API call) just falls
// through to the network untouched.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

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
