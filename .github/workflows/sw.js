const CACHE_NAME = 'club-morphy-v3';
const STATIC_ASSETS = [
  '/Club-Morphy/',
  '/Club-Morphy/index.html',
  '/Club-Morphy/offline.html',
  '/Club-Morphy/manifest.json',
  '/Club-Morphy/assets/icon-72.png',
  '/Club-Morphy/assets/icon-96.png',
  '/Club-Morphy/assets/icon-128.png',
  '/Club-Morphy/assets/icon-144.png',
  '/Club-Morphy/assets/icon-152.png',
  '/Club-Morphy/assets/icon-192.png',
  '/Club-Morphy/assets/icon-256.png',
  '/Club-Morphy/assets/icon-384.png',
  '/Club-Morphy/assets/icon-512.png'
];
const CACHE_LIMIT = 50;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Archivos estáticos cacheados');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.warn('❌ Error al cachear:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('🗑️ Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
            limitCacheSize(CACHE_NAME, CACHE_LIMIT);
          });
          return response;
        })
        .catch(() => {
          return caches.match('/Club-Morphy/offline.html')
            .then(offlineResponse => offlineResponse || caches.match('/Club-Morphy/index.html'));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              limitCacheSize(CACHE_NAME, CACHE_LIMIT);
            });
            return networkResponse;
          })
          .catch(err => {
            console.warn('⚠️ Error de red para:', event.request.url);
            return null;
          });
        return cachedResponse || fetchPromise;
      })
  );
});

function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        const toDelete = keys.slice(0, keys.length - maxItems);
        return Promise.all(toDelete.map(key => cache.delete(key)));
      }
    });
  });
}

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('controllerchange', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NEW_VERSION_AVAILABLE',
        message: 'Hay una nueva versión del sitio. Recarga la página para actualizar.'
      });
    });
  });
});
