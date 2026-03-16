import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './features/notes/notesDb.js'

const app = createApp(App)
app.mount('#app')

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((registration) => {
    // 新 SW 安装完毕后，自动激活（无需用户刷新）
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 新版本已安装，自动激活
          newWorker.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })
  }).catch((error) => {
    console.error('[pwa] service worker register failed', error)
  })

  // 当新 SW 接管后，自动刷新页面加载最新资源
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
