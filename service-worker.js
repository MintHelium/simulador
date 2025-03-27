const CACHE_NAME = 'simulador-icn-v1';

const urlsToCache = [
  './',
  './index.html',
  './script.js',
  './lotes.json',
  './manifest.json',
  './assets/css/styles.css',
  './assets/image/icons/icon-192.png',
  './assets/image/icons/icon-512.png',
  './assets/image/icons/icon-180.png',
  './assets/image/icons/favicon-32.png',
  './assets/image/icons/favicon-16.png',
  './assets/image/brand/logo-icn.png'
];

// Instalación: precachea todo
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpieza de versiones viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Intercepción de requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    ).catch(() => caches.match('./index.html')) // fallback offline
  );
});
