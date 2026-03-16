const CACHE_VERSION = 'kb-pwa-v3'
const STATIC_CACHE = `knowledge-base-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `knowledge-base-runtime-${CACHE_VERSION}`
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-1024.png'
]

/**
 * 读取 Vite 构建清单，提取所有 JS/CSS/资产文件用于预缓存
 * Vite 5 把 manifest 放在 .vite/manifest.json
 */
async function precacheBuildAssets() {
  const paths = ['./.vite/manifest.json', './manifest.json']
  for (const manifestPath of paths) {
    try {
      const response = await fetch(manifestPath, { cache: 'no-store' })
      if (!response.ok) continue
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
      // 继续尝试下一个路径
    }
  }
  return []
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

// ─── fetch：缓存优先，后台更新 ───
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // 跳过非同源请求（CDN、API 等）
  if (url.origin !== self.location.origin) return

  // 导航请求（用户打开应用）→ 缓存优先，后台静默更新
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = await caches.match('./index.html')
        if (cached) {
          // 后台静默更新缓存（不阻塞页面加载）
          event.waitUntil(
            fetch(event.request)
              .then(async (networkResponse) => {
                if (networkResponse.ok) {
                  const cache = await caches.open(STATIC_CACHE)
                  await cache.put('./index.html', networkResponse)
                }
              })
              .catch(() => {})
          )
          return cached
        }

        // 首次访问没有缓存，必须走网络
        try {
          const networkResponse = await fetch(event.request)
          const cache = await caches.open(STATIC_CACHE)
          cache.put('./index.html', networkResponse.clone()).catch(() => {})
          return networkResponse
        } catch (_error) {
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>离线</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;color:#666"><div style="text-align:center"><h2>暂时无法访问</h2><p>请连接网络后首次打开应用，之后即可离线使用。</p><button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border:1px solid #ccc;border-radius:8px;background:#fff;font-size:16px">重试</button></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
          )
        }
      })()
    )
    return
  }

  // 静态资源（JS/CSS/图片/字体）→ 缓存优先
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request)
      if (cached) return cached

      try {
        const response = await fetch(event.request)
        if (response.ok) {
          // 将新资源放入运行时缓存
          const cache = await caches.open(RUNTIME_CACHE)
          cache.put(event.request, response.clone()).catch(() => {})
        }
        return response
      } catch (_error) {
        return new Response('', { status: 503 })
      }
    })()
  )
})
