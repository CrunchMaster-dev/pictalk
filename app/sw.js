// PicTalk service worker — caches the app shell so it runs fully offline.
//
// Strategy: on install, pre-cache every file the app needs. On fetch, serve from
// cache first (instant + offline), falling back to network for anything new.
// Bump CACHE_VERSION whenever the app files change so users get the update.

const CACHE_VERSION = "pictalk-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/data.js",
  "./js/db.js",
  "./js/speech.js",
  "./js/predict.js",
  "./js/keyboard.js",
  "./js/phrases.js",
  "./js/scanning.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          // Cache same-origin successful responses for next time.
          if (resp.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => cached); // offline and not cached -> undefined, handled by browser
    })
  );
});
