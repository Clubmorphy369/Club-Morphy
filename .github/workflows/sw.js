// Nombre de la caché (cámbialo si actualizas la app para forzar la actualización)
const CACHE_NAME = 'club-morphy-v1';

// Archivos que queremos cachear (los esenciales para que funcione offline)
const urlsToCache = [
  '/Club-Morphy/',
  '/Club-Morphy/index.html',
  '/Club-Morphy/manifest.json',
  '/Club-Morphy/assets/icon-192.png',
  '/Club-Morphy/assets/icon-512.png'
  // Si tienes otros archivos (css, js) añádelos aquí
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados correctamente');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.warn('Error al cachear:', err))
  );
});

// Intercepción de peticiones (sirve desde caché si existe)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, lo devolvemos; si no, buscamos en la red
        return response || fetch(event.request);
      })
  );
});

// Limpieza de cachés antiguas al activar
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});