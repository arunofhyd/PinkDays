// A unique name for our cache
const CACHE_NAME = 'pinkdays-cache-v1';

// The files we want to cache for offline use
const urlsToCache = [
  '/',
  '/index.html',
  // Add other assets like your CSS file if you have one
  // '/style.css', 
  'pinkdays_logo.png',
  'pinkdays_transparentlogo.png'
];

// Install the service worker and cache the assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Network-first caching strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
