// sw.js

const CACHE_NAME = 'mini-tcg-pocket-v1';
const ASSETS = [
  '/', 
  '/index.html',
  '/script.js',
  '/manifest.json',
  '/sw.js',
  '/assets/avatar.png',
  // ajoute ici tous tes fichiers CSS, images de cartes, icônes, etc.
];

// À l'installation : on met en cache tous les assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// À l'activation : on purge les anciens caches si nécessaire
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// À chaque requête : on répond depuis le cache si possible, sinon fetch
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        return cached || fetch(event.request);
      })
  );
});
