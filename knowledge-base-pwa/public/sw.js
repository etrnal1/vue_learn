const CACHE_VERSION = 'kb-pwa-v2'
const STATIC_CACHE = `knowledge-base-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `knowledge-base-runtime-${CACHE_VERSION}`
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
]

/**
 * 读取 Vite 构建清单，提取所有 JS/CSS/资产文件用于预缓存
 */
async function precacheBuildAssets() {
  try {
    const response = await fetch('./manifest.json', { cache: 'no-store' })
    if (!response.ok) return []
    const manifest = await response.json()
    const files = new Set()
    const normalize = (value) => `./${String(value).replace(/^\.?\/+/, '')}`

    Object.values(manifest || {}).forEach((item) => {
      if (!item || typeof item !== 'object') return
      if (item.file) files.add(normalize(item.file))
      if (Array.isArray(item.css)) item.css.forEach((file) => files.add(normalize(file)))
      if (Array.isArray(item.assets)) item.assets.forEach((file) => files.add(normalize(file)))
    })

    return [...files]
  } catch (_error) {
    return []
  }
}

// ─── install：预缓存所有静态资源 + 构建产物，立即激活 ───
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE)
    await cache.addAll(APP_SHELL)
    const buildAssets = await precacheBuildAssets()
    if (buildAssets.length) {
      await cache.addAll(buildAssets)
    }
    await self.skipWaiting()
  })())
})

// ─── activate：清除旧版本缓存，立即接管所有客户端 ───
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    )
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ─── fetch：导航请求返回缓存 index.html，其他请求缓存优先 ───
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  // 导航请求（用户点击主屏幕图标、地址栏回车等）
  // 始终返回缓存的 index.html，网络不可用也能打开
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // 先尝试网络获取最新页面
          const networkResponse = await fetch(event.request)
          // 网络成功时更新缓存
          const cache = await caches.open(STATIC_CACHE)
          cache.put('./index.html', networkResponse.clone()).catch(() => {})
          return networkResponse
        } catch (_error) {
          // 网络不可用 → 返回缓存的 index.html
          const cached = await caches.match('./index.html')
          if (cached) return cached
          // 兜底：尝试不带路径的根匹配
          const rootCached = await caches.match('./')
          if (rootCached) return rootCached
          return new Response('离线不可用', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
        }
      })()
    )
    return
  }

  // 非导航请求：缓存优先，网络兜底，网络失败也不报错
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request)
      if (cached) return cached

      try {
        const response = await fetch(event.request)
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE)
          cache.put(event.request, response.clone()).catch(() => {})
        }
        return response
      } catch (_error) {
        // 网络不可用且无缓存 → 返回空响应，不让页面报网络错误
        return new Response('', { status: 503 })
      }
    })()
  )
})
