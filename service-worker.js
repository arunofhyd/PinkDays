const CACHE_NAME = 'pinkdays-cache-v3'; // Increment version for updates

// Core files that make up the "app shell"
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/logo_t.webp',
  '/assets/google.webp',
  '/assets/output.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  // You no longer need to cache the google fonts stylesheet here if you are preloading them in your HTML
  // We will handle font caching dynamically below
];

// Install the service worker and cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Failed to cache one or more URLs:', err);
        });
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

// Fetch event: serve cached content and handle new requests
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Cache-first strategy for app shell assets
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response if found
      if (response) {
        return response;
      }

      // If not in cache, fetch from the network
      return fetch(event.request).then(networkResponse => {
        // Check for valid response and cache it
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const cacheToOpen = (requestUrl.origin === 'https://fonts.gstatic.com') ? 'font-cache' : CACHE_NAME;
        
        // Clone the response to put in cache
        const responseToCache = networkResponse.clone();

        caches.open(cacheToOpen).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;

      }).catch(() => {
        // If fetch fails (e.g., offline), handle gracefully
        // You can add a fallback here for specific routes if needed
        // For example: return caches.match('/offline.html');
        console.log('Network request failed and no cache found:', event.request.url);
      });
    })
  );
});
