// =============================================================
// SERVICE WORKER — Club Morphy
// =============================================================

// ⚠️ Sube la versión cuando hagas cambios importantes
const CACHE_NAME = 'club-morphy-v6';
const OFFLINE_URL = '/Club-Morphy/offline.html';

const STATIC_ASSETS = [
    '/Club-Morphy/',
    '/Club-Morphy/index.html',
    '/Club-Morphy/offline.html',
    '/Club-Morphy/styles.css',
    '/Club-Morphy/entrenador.css',
    '/Club-Morphy/script.js',
    '/Club-Morphy/entrenador.js',
    '/Club-Morphy/manifest.json',
    '/Club-Morphy/assets/android-chrome-192x192.png',
    '/Club-Morphy/assets/android-chrome-512x512.png',
    '/Club-Morphy/assets/apple-touch-icon.png',
    '/Club-Morphy/assets/favicon.ico',
];

// ============================
// INSTALL
// ============================
self.addEventListener('install', event => {
    console.log('[SW] Instalando versión:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Precaching assets');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Algunos assets fallaron al precachear:', err);
            });
        })
    );
    self.skipWaiting();
});

// ============================
// ACTIVATE
// ============================
self.addEventListener('activate', event => {
    console.log('[SW] Activando versión:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => {
                    console.log('[SW] Eliminando caché antigua:', key);
                    return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();

    // Avisar a las pestañas abiertas que hay nueva versión
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
        });
    });
});

// ============================
// FETCH
// ============================
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // 1️⃣ Ignorar métodos que no sean GET
    if (request.method !== 'GET') return;

    // 2️⃣ Ignorar solicitudes a Firebase / Google / APIs externas
    const ignoredHosts = [
        'firebase',
        'firebaseio.com',
        'googleapis.com',
        'gstatic.com',
        'cloudfunctions.net',
        'identitytoolkit.googleapis.com',
        'firestore.googleapis.com',
        'firebasestorage.googleapis.com',
        'cdnjs.cloudflare.com',
        'wikimedia.org',
        'wikipedia.org',
    ];

    if (ignoredHosts.some(host => url.hostname.includes(host))) {
        return;
    }

    // 3️⃣ Ignorar solicitudes que no sean del mismo origen
    if (url.origin !== self.location.origin) return;

    // 4️⃣ Estrategia: Cache First con fallback a red
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) {
                fetch(request)
                    .then(response => {
                        if (response && response.status === 200 && response.type === 'basic') {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, response.clone());
                            });
                        }
                    })
                    .catch(() => { /* offline: ignorar */ });
                return cached;
            }

            return fetch(request)
                .then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    if (request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL)
                            .then(offlinePage => offlinePage || caches.match('/Club-Morphy/index.html'));
                    }
                    return new Response('', {
                        status: 408,
                        statusText: 'Sin conexión'
                    });
                });
        })
    );
});

// ============================
// MENSAJES DESDE LA APP
// ============================
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
