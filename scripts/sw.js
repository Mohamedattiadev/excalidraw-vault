// Service Worker — stale-while-revalidate for static assets, cache-first for scenes/images.
const CACHE = 'exc-vault-v30';
const ASSET_RE = /\/_files\/|\/_scenes\/|\/static\/|\.(?:js|css|woff2?|webp|svg|png|jpe?g|ico|html|json)$/;

self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin asset requests
  if (url.origin !== self.location.origin) return;
  if (!ASSET_RE.test(url.pathname)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetchAndCache = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => cached);
    // Cache-first for binary assets; stale-while-revalidate for everything else
    if (cached && /\/_files\/|\.(?:webp|png|jpe?g|woff2?)$/.test(url.pathname)) {
      fetchAndCache;
      return cached;
    }
    return cached || fetchAndCache;
  })());
});
