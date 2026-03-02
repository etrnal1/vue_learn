const CACHE_VERSION = 'v1.1.0'
const STATIC_CACHE = `vue-learning-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `vue-learning-runtime-${CACHE_VERSION}`
const NETWORK_TIMEOUT_MS = 1800
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

    const normalize = (p) => `/${String(p).replace(/^\/+/, '')}`
    const files = new Set()

    const addItemFiles = (item) => {
      if (!item || typeof item !== 'object') return
      if (item.file) files.add(normalize(item.file))
      if (Array.isArray(item.css)) item.css.forEach((cssFile) => files.add(normalize(cssFile)))
      if (Array.isArray(item.assets)) item.assets.forEach((asset) => files.add(normalize(asset)))
    }

    // Full offline mode: precache all built assets from manifest so every page/tab can open offline.
    Object.values(manifest).forEach((item) => addItemFiles(item))

    return [...files]
  } catch (error) {
    return []
  }
}

function fetchWithTimeout(request, timeoutMs = NETWORK_TIMEOUT_MS) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  return fetch(request, { signal: ctrl.signal }).finally(() => clearTimeout(timer))
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
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
      if (self.registration?.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable()
        } catch (_error) {}
      }
      await self.clients.claim()
    })()
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
  const isHashedAsset = url.pathname.startsWith('/assets/')

  if (isApi) {
    // API: network first + cache fallback, excluding stream/log style endpoints.
    if (url.pathname.includes('/runtime-logs/stream')) return
    if (url.pathname.includes('/runtime-logs')) return

    event.respondWith(
      fetchWithTimeout(request)
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
      (async () => {
        const appShell = await caches.match('/index.html')
        const preloadResponse = await event.preloadResponse
        const networkResponsePromise = fetchWithTimeout(request).then((response) => {
          if (response?.ok) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })

        // SPA app-shell mode: reuse cached index for faster address-entry startup.
        // Keep fetching in background so runtime cache stays warm.
        if (appShell) {
          networkResponsePromise.catch(() => {})
          return appShell
        }

        if (preloadResponse) return preloadResponse
        try {
          return await networkResponsePromise
        } catch (_error) {
          const cached = await caches.match(request)
          if (cached) return cached
          const fallbackShell = await caches.match('/index.html')
          if (fallbackShell) return fallbackShell
          const offline = await caches.match('/offline.html')
          return offline || Response.error()
        }
      })()
    )
    return
  }

  if (isHashedAsset) {
    // Built assets use content-hash in filename, safe for cache-first.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetchWithTimeout(request).then((response) => {
          if (response?.ok) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        }).catch(async () => {
          const fallbackShell = await caches.match('/index.html')
          if (fallbackShell) return fallbackShell
          const offline = await caches.match('/offline.html')
          return offline || Response.error()
        })
      })
    )
    return
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetchWithTimeout(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(async () => {
          if (cached) return cached
          const offline = await caches.match('/offline.html')
          return offline || Response.error()
        })

      return cached || networkFetch
    })
  )
})
