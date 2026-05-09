const CACHE_NAME = 'popis-sanka-v3';
const ASSETS = [
  './popis_sanka.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Instalacija — keširaj sve resurse
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Lokalne resurse keširaj obavezno, eksterne best-effort
      const localAssets = ASSETS.filter(a => a.startsWith('./'));
      const extAssets   = ASSETS.filter(a => !a.startsWith('./'));

      return cache.addAll(localAssets).then(() =>
        Promise.allSettled(extAssets.map(url =>
          fetch(url).then(r => cache.put(url, r)).catch(() => {})
        ))
      );
    })
  );
  self.skipWaiting();
});

// Aktivacija — obriši stare cacheve
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first strategija
self.addEventListener('fetch', event => {
  // Preskoči non-GET i chrome-extension zahtjeve
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Keširaj svježe resurse
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback za navigaciju
        if (event.request.mode === 'navigate') {
          return caches.match('./popis_sanka.html');
        }
      });
    })
  );
});
