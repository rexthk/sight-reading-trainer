const CACHE_NAME = 'shape-first-v3'

async function precacheApp() {
  const cache = await caches.open(CACHE_NAME)
  const core = ['./', './index.html', './manifest.webmanifest', './app-icon.svg']
  try {
    const response = await fetch('./.vite/manifest.json')
    const manifest = await response.json()
    const generated = Object.values(manifest).flatMap((entry) => [
      entry.file,
      ...(entry.css || []),
      ...(entry.assets || []),
    ]).map((path) => `./${path}`)
    await cache.addAll([...new Set([...core, './.vite/manifest.json', ...generated])])
  } catch {
    await cache.addAll(core)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone()
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request.url, copy))
        return response
      }).catch(async () => (await caches.match(event.request.url)) || caches.match('./index.html')),
    )
    return
  }
  event.respondWith(
    caches.match(event.request.url).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone()
      void caches.open(CACHE_NAME).then((cache) => cache.put(event.request.url, copy))
      return response
    })),
  )
})
