/**
 * SERVICE WORKER KHUSUS APLIKASI PETUGAS AIR BERSIH RW 15
 * Terpisah 100% dari cache Aplikasi Petugas Perelek (rw15-petugas)
 */
const CACHE_NAME = 'rw15-petugas-air-bersih-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/html5-qrcode',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW Air RW15] Gagal cache awal:', url, err))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Hanya hapus cache versi lama milik aplikasi Petugas Air Bersih
          if (key.startsWith('rw15-petugas-air-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Jangan pernah meng-cache request POST atau panggilan API Google Apps Script
  if (req.method !== 'GET' || req.url.includes('script.google.com') || req.url.includes('googleusercontent.com')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        // Perbarui cache di latar belakang bila online (Stale-While-Revalidate)
        fetch(req).then((netRes) => {
          if (netRes && netRes.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, netRes.clone()));
          }
        }).catch(() => {});
        return cachedRes;
      }

      return fetch(req).then((netRes) => {
        if (!netRes || netRes.status !== 200 || (netRes.type !== 'basic' && netRes.type !== 'cors')) {
          return netRes;
        }
        const clone = netRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return netRes;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
