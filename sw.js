const CACHE = 'opp-pwa-v0.1.0';
const FILES = [
  './index.html',
  './manifest.webmanifest',
  './src/styles/app.css',
  './src/assets/icon.svg',
  './src/js/app.js',
  './src/js/db.js',
  './src/js/crypto.js',
  './src/js/face.js',
  './src/js/location.js',
  './src/js/parsers.js',
  './src/js/sources.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
