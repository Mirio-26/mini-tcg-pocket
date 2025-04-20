const CACHE_NAME = 'mini-tcg-pocket-v1';
const ASSETS = [
  './',
  'index.html',
  'script.js',
  'manifest.json',
  'sw.js',
  // list all assets/images you voulez précacher
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE_NAME)
          .then(cache=>cache.addAll(ASSETS))
          .then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys
        .filter(k=>k!==CACHE_NAME)
        .map(k=>caches.delete(k)))
    )
  );
});
self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request)
          .then(r=>r||fetch(e.request))
  );
});
