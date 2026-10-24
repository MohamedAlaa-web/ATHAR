/**
 * ATHAR — static hosting Worker for Freebuff Sites.
 *
 * The app is a plain Vite build in dist/: no API, no database, hash routing.
 * This Worker serves those files and adds two things a CDN would otherwise get
 * wrong for a PWA:
 *
 *  - the service worker, the shell and the precache list must never be pinned
 *    by an edge cache, or a browser cannot see a new build;
 *  - hashed files under /assets/ are immutable and can be cached for a year.
 *
 * Client-side routes are hash-based, so any unknown HTML navigation falls back
 * to the app shell (`spa: true` in the manifest does the same; the explicit
 * fallback keeps non-hashed deep links working).
 */

const REVALIDATE = ['/sw.js', '/index.html', '/precache-manifest.json', '/manifest.webmanifest'];

function withCacheHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  if (REVALIDATE.includes(pathname)) {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else if (pathname.startsWith('/assets/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return env.ASSETS.fetch(request);
    }

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return withCacheHeaders(asset, url.pathname);

    const wantsHtml = (request.headers.get('accept') || '').includes('text/html');
    const looksLikeFile = /\.[a-z0-9]+$/i.test(url.pathname);
    if (wantsHtml && !looksLikeFile) {
      const shell = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
      return withCacheHeaders(shell, '/index.html');
    }
    return withCacheHeaders(asset, url.pathname);
  }
};
