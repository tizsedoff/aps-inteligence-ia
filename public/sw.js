// Service worker mínimo: permite instalar la app y muestra una pantalla si no hay conexión.
// No guarda nada de /api ni de Supabase (sesión, chats y pagos siempre van a la red).
const VERSION = 'aps-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE_URL, '/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase, Google Fonts, etc.: red directa
  if (url.pathname.startsWith('/api/')) return;             // nunca cachear la API

  if (req.mode === 'navigate') {
    // Siempre la versión más nueva; solo si no hay red, la pantalla sin conexión.
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    // Archivos con hash en el nombre: nunca cambian, se pueden guardar.
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
