const CACHE_NAME = 'hostal-somnis-v24';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/checkin.js',
  './js/codes.js',
  './js/settings.js',
  './js/store.js',
  './manifest.json',
  './assets/logo.png',
  './assets/app-icon.png',
  './apple-touch-icon.png',
  './apple-touch-icon-precomposed.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Archivos cacheados correctamente para uso offline');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Limpiando caché antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones para funcionar offline (Network First, fallback to Cache)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones a la API si estamos intentando usar el backend
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Actualizar caché si la petición es exitosa
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si no hay red, buscar en el caché
        return caches.match(event.request);
      })
  );
});
