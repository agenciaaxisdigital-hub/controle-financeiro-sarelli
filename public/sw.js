/* ============================================
   Service Worker — Financeiro Sarelli v2.0
   Estratégia: Cache-first estático, Network-first API
   ============================================ */

const CACHE_NAME = 'financeiro-sarelli-v2';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png'];

/* ---------- INSTALL ---------- */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    ])
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar não-GET
  if (request.method !== 'GET') return;

  // Ignorar Supabase (auth, REST, storage)
  if (url.hostname.includes('supabase.co')) return;

  // Ignorar chrome-extension
  if (url.protocol === 'chrome-extension:') return;

  // Navegação (HTML) — network first com fallback para cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Assets JS/CSS/fonts/images — cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      }).catch(() => new Response('', { status: 408 }));
    })
  );
});

/* ---------- PUSH NOTIFICATIONS ---------- */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Financeiro Sarelli';
  const options = {
    body: data.body || 'Você tem contas a vencer em breve.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100, 50, 100],
    tag: data.tag || 'financeiro-notif',
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ver agora' },
      { action: 'close', title: 'Dispensar' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* ---------- NOTIFICATION CLICK ---------- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

/* ---------- BACKGROUND SYNC (futuro) ---------- */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contas') {
    // Placeholder para sincronização offline futura
  }
});
