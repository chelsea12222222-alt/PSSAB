const CACHE_NAME = 'pssab-tanjung-uncang-v28-idcard-modern-motto-mapfix-v2';
const OLD_CACHES = ['pssab-tanjung-uncang-v1','pssab-tanjung-uncang-v2','pssab-tanjung-uncang-v3','pssab-tanjung-uncang-v4','pssab-tanjung-uncang-v5','pssab-tanjung-uncang-v6','pssab-tanjung-uncang-v7','pssab-tanjung-uncang-v8','pssab-tanjung-uncang-v9','pssab-tanjung-uncang-v10','pssab-tanjung-uncang-v11','pssab-tanjung-uncang-v21'];
const STATIC_ASSETS = ['./manifest.json','./icons/logo.jpg','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      ...OLD_CACHES.map(name => caches.delete(name)),
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith('pssab-tanjung-uncang-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
    ]).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Always fetch HTML/navigation from the network so new app versions appear immediately.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => response)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Never cache API/Supabase requests.
  const url = new URL(request.url);
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/') || url.pathname.includes('/auth/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets: network first, cache fallback.
  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
