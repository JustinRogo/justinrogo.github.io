'use strict';

// The UCPEA Member Dashboard moved to /UCPEA/ (github.com/JustinRogo/UCPEA) in
// November 2026. This worker replaces the old one at /Pages/Work/UCPEA/ on
// devices that installed it. It:
// - clears the old dashboard caches,
// - sends every page load to the same page, query string and hash at /UCPEA/,
// - keeps showing alerts sent to subscriptions made at the old address, and
//   opens them at the new one, until the new app moves the subscription over
//   (account-notifications.js in the new repository). A push that shows no
//   notification can get a subscription revoked, so the handlers stay.
// Remove after May 2027, together with the redirect pages next to it.

const OLD_CACHE_PREFIX = 'ucpea-dashboard-';
const oldScope = new URL(self.registration.scope);
const scope = new URL('/UCPEA/', oldScope.origin);
const homeURL = new URL('index.html', scope).href;

function newAddress(url) {
  const next = new URL(url);
  if (next.origin === oldScope.origin && next.pathname.startsWith(oldScope.pathname)) {
    next.pathname = scope.pathname + next.pathname.slice(oldScope.pathname.length);
  }
  return next.href;
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(OLD_CACHE_PREFIX)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(Response.redirect(newAddress(event.request.url), 302));
});

const postIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

self.addEventListener('push', event => {
  let payload;
  try { payload = event.data?.json(); } catch { /* Show a generic alert. */ }
  const isTest = payload?.type === 'test';
  const isBoardPost = payload?.type === 'board' && typeof payload.postId === 'string' && postIdPattern.test(payload.postId);
  const isSignup = payload?.type === 'signup';
  const type = isTest ? 'test' : isBoardPost ? 'board' : isSignup ? 'signup' : 'update';
  // Sign-ups come from the public: never show a name or email on a lock screen.
  const body = {
    test: 'Test notification. Tap to open your account.',
    board: 'New UCPEA bulletin board post. Tap to open it.',
    signup: 'New member sign-up waiting for approval. Tap to review it.',
    update: 'Open the dashboard to see the latest updates.',
  };
  event.waitUntil(self.registration.showNotification('UCPEA Member Dashboard', {
    body: body[type],
    icon: new URL('icons/icon-192.png', scope).href,
    tag: isBoardPost ? `ucpea-board-${payload.postId}` : `ucpea-${type}`,
    renotify: isSignup,
    data: isBoardPost ? { type, postId: payload.postId } : { type },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(homeURL);
  const { type, postId } = event.notification.data || {};
  if (type === 'test') url.searchParams.set('view', 'account');
  else if (type === 'signup') url.searchParams.set('view', 'members');
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
    // The new app is already open: bring it forward and switch views in place.
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
