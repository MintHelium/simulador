const CACHE_NAME = 'simulador-icn-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './lotes.json',
  './manifest.json',
  './assets/image/icons/icon-192.png',
  './assets/image/icons/icon-512.png',
  './assets/image/icons/icon-180.png',
  './assets/image/icons/favicon-32.png',
  './assets/image/icons/favicon-16.png',

];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
''