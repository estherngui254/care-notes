// Caches the app so it opens offline. Plants themselves live in localStorage, not here.
// Bump the cache name whenever the app is deployed, so browsers drop the old copy straight away.
const CACHE = 'plant-care-notes-v5'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// Cache-first for the files (their names change when the app is rebuilt), but network-first for the
// page itself, so a newly deployed version is never hidden behind an older cached copy.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  const isPage = request.mode === 'navigate'

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (isPage) {
        const fresh = await fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => null)
        return fresh ?? (await cache.match(request, { ignoreSearch: true })) ?? Response.error()
      }

      const cached = await cache.match(request, { ignoreSearch: true })
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => cached)
      return cached ?? refresh
    }),
  )
})
