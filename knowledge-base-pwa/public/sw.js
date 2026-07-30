const CACHE_VERSION = 'kb-pwa-v14'
const STATIC_CACHE = `knowledge-base-static-${CACHE_VERSION}`

// 构建时由 vite 插件自动注入资源列表，不再运行时 fetch manifest
const BUILD_ASSETS = /*__BUILD_ASSETS__*/[]

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-1024.png'
]

const PRECACHE_URLS = [...APP_SHELL, ...BUILD_ASSETS]

// ─── install：预缓存全部资源，等待用户确认更新 ───
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE)
    // 逐个缓存，单个失败不影响整体
    for (const url of PRECACHE_URLS) {
      try {
        await cache.add(url)
      } catch (err) {
        console.warn('[sw] precache failed:', url, err.message)
      }
    }
    // 不再自动 skipWaiting，等用户点击"立即更新"后通过 message 触发
  })())
})

// ─── activate：清除旧版本缓存，立即接管 ───
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE)
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

// ─── Web Share Target：接收系统分享的文件/文本，存入临时收件箱后交给页面处理 ───
const SHARE_DB_NAME = 'kb-share-inbox'
const SHARE_STORE_NAME = 'pendingShares'

function openShareDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(SHARE_STORE_NAME, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData()
    const title = formData.get('title') || ''
    const text = formData.get('text') || ''
    const link = formData.get('url') || ''
    const files = formData.getAll('file').filter((f) => f && typeof f.arrayBuffer === 'function' && f.size > 0)

    const db = await openShareDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SHARE_STORE_NAME, 'readwrite')
      const store = tx.objectStore(SHARE_STORE_NAME)
      if (files.length) {
        files.forEach((file) => {
          store.add({ kind: 'file', name: file.name, type: file.type, size: file.size, file, title, text, link, createdAt: Date.now() })
        })
      } else if (title || text || link) {
        store.add({ kind: 'text', title, text, link, createdAt: Date.now() })
      }
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('[sw] share-target 处理失败:', err && err.message)
  }
  // 303 让浏览器用 GET 重新导航，避免 POST 表单重复提交
  return Response.redirect('./index.html?shared=1', 303)
}

// ─── fetch：缓存优先 ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShareTarget(event))
    return
  }

  if (event.request.method !== 'GET') return

  if (url.origin !== self.location.origin) return

  // 导航请求 → 返回缓存的 index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // 用绝对 URL 构建 index.html 的完整路径来匹配缓存
        const swScope = self.registration.scope
        const indexUrl = new URL('index.html', swScope).href

        const cache = await caches.open(STATIC_CACHE)
        // 尝试多种匹配方式：完整 URL、相对路径、scope 根路径
        let cached = await cache.match(indexUrl)
          || await cache.match(new URL('./', swScope).href)
          || await cache.match(event.request)

        if (cached) {
          // 后台静默更新（不阻塞页面渲染）
          event.waitUntil(
            fetch(event.request)
              .then(async (res) => {
                if (res.ok) {
                  await cache.put(indexUrl, res.clone())
                  await cache.put(new URL('./', swScope).href, res)
                }
              })
              .catch(() => {})
          )
          return cached
        }

        // 首次访问：走网络
        try {
          const res = await fetch(event.request)
          // 同时缓存为多个 key，确保离线时任何方式都能命中
          await cache.put(indexUrl, res.clone())
          await cache.put(new URL('./', swScope).href, res.clone())
          return res
        } catch (_err) {
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>离线</title></head>'
            + '<body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;color:#666">'
            + '<div style="text-align:center"><h2>暂时无法访问</h2><p>请连接网络后首次打开应用，之后即可离线使用。</p>'
            + '<button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border:1px solid #ccc;border-radius:8px;background:#fff;font-size:16px">重试</button>'
            + '</div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
          )
        }
      })()
    )
    return
  }

  // 静态资源 → 缓存优先
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request)
      if (cached) return cached

      try {
        const res = await fetch(event.request)
        if (res.ok) {
          const cache = await caches.open(STATIC_CACHE)
          cache.put(event.request, res.clone()).catch(() => {})
        }
        return res
      } catch (_err) {
        return new Response('', { status: 503 })
      }
    })()
  )
})
