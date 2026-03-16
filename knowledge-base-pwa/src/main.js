import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './features/notes/notesDb.js'

const app = createApp(App)
app.mount('#app')

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((registration) => {
    // 已有等待中的 SW，提示更新
    if (registration.waiting) {
      showUpdatePrompt(registration.waiting)
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdatePrompt(newWorker)
        }
      })
    })

    // 每次打开检查更新
    setInterval(() => registration.update(), 60 * 1000)
  }).catch((error) => {
    console.error('[pwa] service worker register failed', error)
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

function showUpdatePrompt(worker) {
  const bar = document.createElement('div')
  bar.className = 'sw-update-bar'
  bar.innerHTML = `
    <span>发现新版本，点击更新</span>
    <button onclick="this.parentElement._worker.postMessage({type:'SKIP_WAITING'})">立即更新</button>
    <button onclick="this.parentElement.remove()" class="dismiss">稍后</button>
  `
  bar._worker = worker
  document.body.appendChild(bar)
}
