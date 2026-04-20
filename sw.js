// Minimal service worker — cache-first for app shell, network fallback.
const VERSION = 'sabrina-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './src/app.js',
  './src/styles.css',
  './src/storage.js',
  './src/crypto.js',
  './src/notifications.js',
  './src/affirmations.js',
  './src/screens/onboarding.js',
  './src/screens/today.js',
  './src/screens/reflect.js',
  './src/screens/collection.js',
  './src/screens/settings.js',
  './src/screens/detail.js',
  './src/screens/lock.js',
  './data/index.json',
  './data/sources/marcus-aurelius.json',
  './data/sources/tao-te-ching.json',
  './data/sources/dhammapada.json',
  './data/sources/bhagavad-gita.json',
  './data/sources/epictetus.json',
  './data/sources/seneca.json',
  './data/sources/confucius.json',
  './data/sources/bible.json',
  './data/sources/rumi.json',
  './data/sources/hafiz.json',
  './data/sources/rilke.json',
  './data/sources/emerson.json',
  './data/sources/thoreau.json',
  './data/sources/whitman.json',
  './data/sources/tagore.json',
  './data/sources/gibran.json',
  './data/sources/upanishads.json',
  './data/sources/havamal.json',
  './data/sources/proverbs.json',
  './data/sources/modern.json',
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
