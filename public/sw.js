const CACHE_VERSION = 'v1.1.0'
const STATIC_CACHE = `vue-learning-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `vue-learning-runtime-${CACHE_VERSION}`
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
]

async function precacheBuildAssets() {
  try {
    const res = await fetch('/manifest.json', { cache: 'no-store' })
    if (!res.ok) return []
    const manifest = await res.json()
    if (!manifest || typeof manifest !== 'object') return []

    const files = new Set()
    for (const item of Object.values(manifest)) {
      if (!item || typeof item !== 'object') continue
      if (item.file) files.add(`/${String(item.file).replace(/^\/+/, '')}`)
      if (Array.isArray(item.css)) {
        item.css.forEach((cssFile) => files.add(`/${String(cssFile).replace(/^\/+/, '')}`))
      }
      if (Array.isArray(item.assets)) {
        item.assets.forEach((asset) => files.add(`/${String(asset).replace(/^\/+/, '')}`))
      }
    }
    return [...files]
  } catch (error) {
    return []
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await cache.addAll(APP_SHELL)
      const buildAssets = await precacheBuildAssets()
      if (buildAssets.length) {
        await cache.addAll(buildAssets)
      }
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isApi = url.pathname.startsWith('/api/')

  if (isApi) {
    // API: network first + cache fallback, excluding stream/log style endpoints.
    if (url.pathname.includes('/runtime-logs/stream')) return
    if (url.pathname.includes('/runtime-logs')) return

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          return new Response(JSON.stringify({ error: '离线且无缓存数据' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
        })
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const appShell = await caches.match('/index.html')
          if (appShell) return appShell
          return caches.match('/offline.html')
        })
    )
    return
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => cached)

      return cached || networkFetch
    })
  )
})
