const CACHE_NAME = 'pinkdays-cache-v1';

// List of files to cache on install.
const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'assets/logo.png', // This logo is no longer in the HTML, but including it just in case.
  'assets/logo_t.png',
  'assets/output.css',
  'assets/google.webp',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching assets');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Caching failed', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Cache-First Strategy for core assets.
  // This will check the cache first and fall back to the network.
  const isCoreAsset = urlsToCache.some(url => request.url.includes(url.replace('./', '')));
  const isFontAwesome = request.url.includes('cdnjs.cloudflare.com/ajax/libs/font-awesome/');
  const isFirebase = request.url.includes('www.gstatic.com/firebasejs/');

  // Use cache-first for all static assets and the external Font Awesome library
  if (isCoreAsset || isFontAwesome) {
    event.respondWith(
      caches.match(request).then((response) => {
        // Return from cache or fetch from network
        return response || fetch(request).then(fetchResponse => {
          // Cache the new response for future use
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  } else if (isFirebase) {
    // A network-only strategy is best for dynamic scripts like Firebase SDKs
    // to ensure the latest version is always used.
    event.respondWith(fetch(request));
  } else {
    // Network-First Strategy for all other requests.
    // This ensures you always have the latest data if a connection is available.
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          // If network fails, try to get a response from the cache.
          return caches.match(request);
        })
    );
  }
});
