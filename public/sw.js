// Service Worker for Fusion Alarm PWA
const CACHE_NAME = 'fusion-alarm-v2';
const urlsToCache = [
  '/',
  '/CSG-v2.otf',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline, but bypass SSE requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Bypass Service Worker for:
  // 1. SSE/EventSource requests
  // 2. Requests with Accept: text/event-stream header
  // 3. Requests to /api/events/stream
  // 4. External API requests (not same origin)
  const shouldBypass = 
    event.request.headers.get('Accept')?.includes('text/event-stream') ||
    url.pathname.includes('/api/events/stream') ||
    url.pathname.includes('/events/') ||
    url.hostname !== self.location.hostname ||
    event.request.headers.get('X-Bypass-Service-Worker') === 'true';

  if (shouldBypass) {
    // Let the request go directly to the network
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        return fetch(event.request);
      })
      .catch(error => {
        // Return the original fetch request as fallback
        return fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 