// Minimal service worker — cache-first for app shell, network fallback.
const VERSION = 'sabrina-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './src/app.js',
  './src/styles.css',
  './src/storage.js',
  './src/notifications.js',
  './src/affirmations.js',
  './src/screens/onboarding.js',
  './src/screens/today.js',
  './src/screens/reflect.js',
  './src/screens/collection.js',
  './src/screens/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Skip cross-origin (e.g. Google Fonts) — let browser handle
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
