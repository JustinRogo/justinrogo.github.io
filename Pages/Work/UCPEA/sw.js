'use strict';

const CACHE_PREFIX = 'ucpea-dashboard-';
const CACHE_NAME = CACHE_PREFIX + 'v42';
const scope = new URL(self.registration.scope);
const homeURL = new URL('index.html', scope).href;
// How long a request waits for the network before a saved copy is used.
const NETWORK_WAIT = 3000;
const offlineURLs = new Set([
  'index.html',
  'styles.css',
  'theme.css',
  'tool-theme.css',
  'app.js',
  'contract-sheet.js',
  'member-rights.js',
  'document-library.js',
  'tool-views.js',
  'calendar.js',
  'calendar-events.js',
  'account.js',
  'account-notifications.js',
  'members.js',
  'board.js',
  'union-wire-feed.js',
  'union-wire.js',
  'UCPEAContract.html',
  'contract-reader.js',
  'contract-reader.css',
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

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
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

  // On a weak signal, open from the saved copy after a short wait instead of
  // showing a blank screen. The download above still finishes and refreshes it.
  event.respondWith((async () => {
    const fromNetwork = network.catch(() => null);
    const slow = new Promise(resolve => setTimeout(resolve, NETWORK_WAIT, 'slow'));
    const response = await Promise.race([fromNetwork, slow]);
    if (response && response !== 'slow' && response.status < 500) return response;
    const cached = await caches.match(key, { cacheName: CACHE_NAME }).catch(() => null);
    if (cached) return cached;
    const late = response === 'slow' ? await fromNetwork : response;
    return late || Response.error();
  })());
});

const postIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

self.addEventListener('push', event => {
  let payload;
  try { payload = event.data?.json(); } catch { /* Show a generic alert. */ }
  const isTest = payload?.type === 'test';
  const isBoardPost = payload?.type === 'board' && typeof payload.postId === 'string' && postIdPattern.test(payload.postId);
  const type = isTest ? 'test' : isBoardPost ? 'board' : 'update';
  const body = {
    test: 'Test notification. Tap to open your account.',
    board: 'New UCPEA bulletin board post. Tap to open it.',
    update: 'Open the dashboard to see the latest updates.',
  };
  event.waitUntil(self.registration.showNotification('UCPEA Member Dashboard', {
    body: body[type],
    icon: new URL('icons/icon-192.png', scope).href,
    tag: isBoardPost ? `ucpea-board-${payload.postId}` : `ucpea-${type}`,
    data: isBoardPost ? { type, postId: payload.postId } : { type },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(homeURL);
  const { type, postId } = event.notification.data || {};
  if (type === 'test') url.searchParams.set('view', 'account');
  else if (type === 'board' && typeof postId === 'string' && postIdPattern.test(postId)) {
    url.searchParams.set('view', 'board');
    url.hash = `post-${postId}`;
  }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const match = windows.find(client => client.url === url.href);
    if (match) {
      await match.focus();
      return;
    }
    // The app is already open on another view: bring it forward and switch
    // views in place, instead of opening a second copy.
    const dashboard = windows.find(client => client.frameType !== 'nested' &&
      [scope.href, homeURL].includes(client.url.split(/[?#]/)[0]));
    if (dashboard) {
      await dashboard.focus();
      dashboard.postMessage({ type: 'ucpea-open', url: url.href });
    } else {
      await self.clients.openWindow(url.href);
    }
  })());
});
