import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './features/notes/notesDb.js'

const app = createApp(App)
app.mount('#app')

// SW 更新状态挂在 window 上，供 Vue 组件读取
window.__swUpdate = { available: false, worker: null }

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((registration) => {
    console.log('[pwa] SW registered, scope:', registration.scope)

    function markUpdateReady(worker) {
      console.log('[pwa] update ready')
      window.__swUpdate = { available: true, worker }
      // 通知 Vue 组件
      window.dispatchEvent(new CustomEvent('sw-update-found'))
    }

    // 已有等待中的 SW
    if (registration.waiting) {
      markUpdateReady(registration.waiting)
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          markUpdateReady(newWorker)
        }
      })
    })

    // 打开时检查更新
    registration.update().catch(() => {})
    // 每 60 秒静默检查
    setInterval(() => registration.update().catch(() => {}), 60 * 1000)
    // 从后台切回时检查
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {})
      }
    })
  }).catch((error) => {
    console.error('[pwa] SW register failed', error)
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
