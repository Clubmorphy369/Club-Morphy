// =============================================================
// SERVICE WORKER — Club Morphy
// =============================================================

// ⚠️ Sube la versión cuando hagas cambios importantes
// ⭐ v14: fix multi-dispositivo + juego vs IA + reloj + análisis
const CACHE_NAME = 'club-morphy-v14';
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

// ⭐ Flag para saber si había una versión previa instalada
let habiaCachePrevia = false;

// ============================
// INSTALL
// ============================
self.addEventListener('install', event => {
    console.log('[SW] Instalando versión:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(keys => {
            // ⭐ ¿Ya existía alguna caché de club-morphy antes?
            habiaCachePrevia = keys.some(key => key.startsWith('club-morphy-'));
            return caches.open(CACHE_NAME).then(cache => {
                console.log('[SW] Precaching assets');
                return cache.addAll(STATIC_ASSETS).catch(err => {
                    console.warn('[SW] Algunos assets fallaron al precachear:', err);
                });
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

    // ⭐ Solo avisar a las pestañas si ESTA instalación es una actualización real
    // (no la primera vez que el usuario abre la página)
    if (habiaCachePrevia) {
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
            });
        });
    }
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
        'lichess.org',
        'stockfish',
        'jsdelivr.net',
    ];

    if (ignoredHosts.some(host => url.hostname.includes(host))) {
        return;
    }

    // 3️⃣ Ignorar solicitudes que no sean del mismo origen
    if (url.origin !== self.location.origin) return;

    // ⭐ 4️⃣ Decidir estrategia según tipo de recurso
    //    - HTML / JS / CSS  → NETWORK FIRST (siempre la última versión)
    //    - resto (iconos)   → CACHE FIRST    (rápido, cambian poco)
    const esHtml = /\.html?$/i.test(url.pathname);
    const esJs = /\.js$/i.test(url.pathname);
    const esCss = /\.css$/i.test(url.pathname);
    const esRaiz = url.pathname === '/Club-Morphy/' || url.pathname === '/Club-Morphy';

    if (esHtml || esJs || esCss || esRaiz) {
        // 🚀 NETWORK FIRST: intenta red; si falla, usa cache; si no hay cache, offline.html
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then(cached => {
                        if (cached) return cached;
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
        return;
    }

    // 📦 CACHE FIRST: para iconos, manifest, offline.html (cambian poco)
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request)
                .then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
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
