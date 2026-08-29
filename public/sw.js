/**
 * Service worker.
 *
 * The offline goal here is specific and small: once a citizen has run their
 * check, the findings and the fix instructions must stay readable when the
 * connection drops. Someone standing outside a corporation office on a bad
 * signal should still be able to see which document is wrong and where to get
 * the replacement.
 *
 * So: the app shell is precached, GET API responses are cached
 * stale-while-revalidate, and any API request that fails offline returns a
 * readable JSON error rather than an unhandled rejection. Mutating requests
 * are never cached and never queued — silently replaying a submission later
 * would be worse than failing now.
 */

const VERSION = 'seedha-v6';
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;

const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;      // fonts etc. use their own caching

  // PDFs are generated per case and must never be served stale.
  if (url.pathname.endsWith('.pdf')) return;

  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/meta' || url.pathname === '/api/health') {
      event.respondWith(networkFirst(request));
      return;
    }
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Navigation: network first so a deploy is picked up, shell as the fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || offlineShell()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(SHELL).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => cached))
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => null);

  if (cached) {
    network.catch(() => {});
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;

  return new Response(
    JSON.stringify({
      error: 'You are offline, and this answer is not in your device cache yet.',
      offline: true,
      recover: 'Anything already on screen — including every fix and where to get it — stays readable. Reconnect to run a new check.'
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

async function networkFirst(request) {
  const cache = await caches.open(DATA);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'You are offline.', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function offlineShell() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Offline — Seedha Kaam</title>'
    + '<div style="font-family:system-ui,sans-serif;padding:2rem;max-width:34rem;margin:auto;line-height:1.6">'
    + '<h1 style="font-size:1.4rem">You are offline</h1>'
    + '<p>Seedha Kaam has not been opened on this device yet, so there is nothing cached to show you.</p>'
    + '<p>Once you have opened it while connected, your findings and fix instructions stay readable offline.</p>'
    + '</div>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
