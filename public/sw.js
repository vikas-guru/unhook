/* Unhook service worker — makes the app installable and offline-capable.
 *
 * Strategy: NETWORK-FIRST for same-origin GETs, cache as fallback. This keeps
 * development fresh (Vite HMR / new bundles are always fetched live) while
 * still giving an offline shell. Cross-origin requests (Gemini, Firebase,
 * Google Fonts) are never intercepted, so real AI calls are untouched. */
const CACHE = 'unhook-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/maskable-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})            // a missing shell entry must not block install
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return   // leave AI/font/CDN calls alone

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
      .catch(() =>
        caches.match(request).then(
          (cached) => cached || (request.mode === 'navigate' ? caches.match('/') : undefined),
        ),
      ),
  )
})
