const CACHE_NAME = 'cuentos-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// External resources to cache on first use
const CACHE_ON_USE = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.midjourney.com'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Check if this is a resource we should cache on use
  const shouldCacheOnUse = CACHE_ON_USE.some(domain => url.hostname.includes(domain));

  if (shouldCacheOnUse) {
    // Cache-first for external resources (images, fonts, videos)
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) {
            return cached;
          }
          return fetch(event.request)
            .then(response => {
              // Don't cache if not successful
              if (!response || response.status !== 200) {
                return response;
              }
              // Clone the response
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return response;
            })
            .catch(() => {
              // Return a placeholder for failed image/video requests
              return new Response('', { status: 503, statusText: 'Offline' });
            });
        })
    );
  } else {
    // Network-first for same-origin requests
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(event.request);
        })
    );
  }
});
