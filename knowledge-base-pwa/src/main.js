import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './features/notes/notesDb.js'

const app = createApp(App)
app.mount('#app')

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((registration) => {
    console.log('[pwa] SW registered, scope:', registration.scope)

    // 已有等待中的 SW，提示更新
    if (registration.waiting) {
      console.log('[pwa] SW waiting found on load')
      showUpdatePrompt(registration.waiting)
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return
      console.log('[pwa] SW update found, state:', newWorker.state)
      newWorker.addEventListener('statechange', () => {
        console.log('[pwa] SW state changed to:', newWorker.state)
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // 有旧 SW 在控制页面 → 这是更新
            showUpdatePrompt(newWorker)
          }
          // 如果没有 controller，说明是首次安装，无需提示
        }
      })
    })

    // 打开时立即检查一次更新
    registration.update().catch(() => {})
    // 之后每 60 秒检查
    setInterval(() => registration.update().catch(() => {}), 60 * 1000)
    // 页面恢复可见时也检查（从后台切回来）
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
    console.log('[pwa] controller changed, reloading')
    window.location.reload()
  })
}

function showUpdatePrompt(worker) {
  // 避免重复显示
  if (document.querySelector('.sw-update-bar')) return
  const bar = document.createElement('div')
  bar.className = 'sw-update-bar'
  bar.innerHTML = `
    <span>🆕 发现新版本</span>
    <button onclick="this.parentElement._worker.postMessage({type:'SKIP_WAITING'})">立即更新</button>
    <button onclick="this.parentElement.remove()" class="dismiss">稍后</button>
  `
  bar._worker = worker
  document.body.appendChild(bar)
}
