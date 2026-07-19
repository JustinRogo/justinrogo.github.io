const CACHE_PREFIX = "midnight-tarot";
const CACHE_VERSION = "v3";
const APP_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const OFFLINE_PAGE = new URL("./index.html", self.location).href;

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=12",
  "./deck.js?v=4",
  "./app.js?v=14",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirstPage(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(OFFLINE_PAGE, response.clone());
    return response;
  } catch {
    return cache.match(OFFLINE_PAGE);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(APP_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith(new URL("./", self.location.href).pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
