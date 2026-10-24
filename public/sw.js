/*
 * ATHAR service worker — offline app shell.
 *
 * Strategy:
 *  - install: precache the shell, the icons and every built asset listed in
 *    `precache-manifest.json` (Vite emits it from the real bundle, including
 *    the fingerprinted self-hosted font files). After one online visit the app
 *    renders fully offline — no Google Fonts request is ever made.
 *  - navigation: network-first, falling back to the cached shell.
 *  - same-origin assets (JS/CSS/img/font): stale-while-revalidate, so a reload
 *    after the first visit is served locally.
 *  - Range requests and the heavy /assets/media/ library are never cached:
 *    caching partial (206) video responses breaks seeking, and the videos are
 *    streamed on demand with a graceful fallback in the UI.
 */
const VERSION = 'athar-v5';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/athar.svg',
  './icons/athar-192.png',
  './icons/athar-512.png',
  './icons/athar-maskable-512.png',
  './icons/apple-touch-icon.png'
];
const PRECACHE_MANIFEST = './precache-manifest.json';

async function cacheUrl(cache, url) {
  try {
    /* `reload` bypasses the HTTP cache so a stale index is never baked in. */
    await cache.add(new Request(url, { cache: 'reload' }));
    return true;
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(SHELL_URLS.map((url) => cacheUrl(cache, url)));

      try {
        const response = await fetch(PRECACHE_MANIFEST, { cache: 'no-cache' });
        if (response.ok) {
          const manifest = await response.json();
          if (Array.isArray(manifest.urls)) {
            await Promise.all(manifest.urls.map((url) => cacheUrl(cache, url)));
          }
        }
      } catch {
        /* The shell is still enough to boot; assets fill in as they are used. */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

const isCacheable = (request, url) => {
  if (request.method !== 'GET') return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  /* never cache byte-range requests (video/audio seeking) */
  if (request.headers.has('range')) return false;
  /* media library is streamed on demand, not part of the offline shell */
  if (url.origin === self.location.origin && url.pathname.includes('/assets/media/')) return false;
  return url.origin === self.location.origin;
};

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put('./index.html', response.clone()).catch(() => {});
    }
    return response;
  } catch {
    /* `crossorigin` module/stylesheet requests carry an Origin header, while
     * cache.add() stored the same URL without one. Vary: Origin would make the
     * precached copy miss, so static assets are matched by URL only. */
    const cached =
      (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ||
      (await cache.match('./index.html', { ignoreVary: true })) ||
      (await cache.match('./', { ignoreVary: true }));
    if (cached) return cached;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>ATHAR offline</title><body style="background:#080B10;color:#F4EFE6;font-family:system-ui;padding:2rem">ATHAR needs one online visit to install. Reconnect once and reload.</body>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function staleWhileRevalidate(request) {
  /* Precached shell assets live in SHELL_CACHE, newer assets land in
   * RUNTIME_CACHE. caches.match() checks both, so an offline reload of a
   * fingerprinted font/JS/CSS file is served from the precache. */
  const cached = await caches.match(request, { ignoreVary: true });
  const cache = await caches.open(RUNTIME_CACHE);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (!isCacheable(request, url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});
