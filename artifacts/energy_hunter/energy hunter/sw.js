const CACHE_NAME = 'energy-hunter-v3';
const PRECACHE_ASSETS = [
  './',
  './energypro.html',
  './energypro.css',
  './energypro.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './chart.umd.min.js',
  './html2canvas.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Отправку данных и запросы к API никогда не кэшируем
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Навигация: сначала сеть (чтобы подтянуть свежую версию), офлайн — из кэша
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./energypro.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
