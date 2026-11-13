'use strict';

const CACHE_PREFIX = 'ucpea-dashboard-';
const CACHE_NAME = CACHE_PREFIX + 'v20';
const scope = new URL(self.registration.scope);
const homeURL = new URL('index.html', scope).href;
const offlineURLs = new Set([
  'index.html',
  'styles.css',
  'theme.css',
  'tool-theme.css',
  'app.js',
  'member-rights.js',
  'document-library.js',
  'tool-views.js',
  'calendar.js',
  'calendar-events.js',
  'account.js',
  'members.js',
  'board.js',
  'union-wire-feed.js',
  'union-wire.js',
  'UCPEAContract.html',
  'UCPEA_Contract_History.html',
  'UCPEA_Contract_Comparison.html',
  'UCPEA-Area-Explorer.html',
  'ucpea-logo.png',
  'manifest.webmanifest',
  'pwa.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
].map(path => new URL(path, scope).href));

// The sign-in library is shared with the Updates page (the site build copies it
// there). It is cached too, but separately, so a missing copy never breaks the install.
const supabaseURL = new URL('../../Updates/vendor/supabase.js', scope).href;
const coreURLs = [...offlineURLs];
offlineURLs.add(supabaseURL);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    await cache.addAll(coreURLs);
    await cache.add(supabaseURL).catch(() => {});
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

function offlineKey(request) {
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return null;
  if (url.pathname === scope.pathname) return homeURL;
  // Dashboard routes and embedded theme variants all serve the same static files.
  url.search = '';
  url.hash = '';
  return offlineURLs.has(url.href) ? url.href : null;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const key = offlineKey(event.request);
  if (!key) return;

  // Use the current deployment when reachable, with a saved copy for offline use.
  const network = fetch(event.request);
  event.waitUntil(network.then(response => {
    if (!response.ok || response.redirected) return;
    const copy = response.clone();
    return caches.open(CACHE_NAME).then(cache => cache.put(key, copy));
  }).catch(() => {}));

  event.respondWith((async () => {
    const response = await network.catch(() => null);
    if (response && response.status < 500) return response;
    const cached = await caches.match(key, { cacheName: CACHE_NAME }).catch(() => null);
    return cached || response || Response.error();
  })());
});
