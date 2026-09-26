// =============================================================
// SERVICE WORKER — Club Morphy
// =============================================================

// ⚠️ Sube la versión cuando hagas cambios importantes
// ⭐ v36: rutas relativas (compatibilidad Firebase + GitHub Pages)
const CACHE_NAME = 'club-morphy-v36';

// Scope dinámico: funciona tanto en "/" (Firebase) como en "/Club-Morphy/" (GitHub Pages)
const ROOT = self.registration.scope;
const OFFLINE_URL = ROOT + 'offline.html';

const STATIC_ASSETS = [
    ROOT,
    ROOT + 'index.html',
    ROOT + 'offline.html',
    ROOT + 'styles.css',
    ROOT + 'entrenador.css',
    ROOT + 'script-core.js',
    ROOT + 'script-curso.js',
    ROOT + 'script-render.js',
    ROOT + 'script-main.js',
    ROOT + 'entrenador-core.js',
    ROOT + 'entrenador-tablero.js',
    ROOT + 'entrenador-api.js',
    ROOT + 'manifest.json',
    ROOT + 'assets/android-chrome-192x192.png',
    ROOT + 'assets/android-chrome-512x512.png',
    ROOT + 'assets/apple-touch-icon.png',
    ROOT + 'assets/favicon.ico',
];

// ⭐ Flag para saber si había una versión previa instalada
let habiaCachePrevia = false;

// ============================
// INSTALL
// ============================
self.addEventListener('install', event => {
    console.log('[SW] Instalando versión:', CACHE_NAME, 'scope:', ROOT);
    event.waitUntil(
        caches.keys().then(keys => {
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

    if (request.method !== 'GET') return;

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

    if (url.origin !== self.location.origin) return;

    const esHtml = /\.html?$/i.test(url.pathname);
    const esJs = /\.js$/i.test(url.pathname);
    const esCss = /\.css$/i.test(url.pathname);
    const esRaiz = url.pathname === '/' || url.pathname === '/Club-Morphy/' || url.pathname.endsWith('/');

    if (esHtml || esJs || esCss || esRaiz) {
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
                                .then(offlinePage => offlinePage || caches.match(ROOT + 'index.html'));
                        }
                        return new Response('', { status: 408, statusText: 'Sin conexión' });
                    });
                })
        );
        return;
    }

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
                            .then(offlinePage => offlinePage || caches.match(ROOT + 'index.html'));
                    }
                    return new Response('', { status: 408, statusText: 'Sin conexión' });
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
