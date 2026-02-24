import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import App from './App.vue'
import './style.css'
import './ios-unified.css'
import { detectPWA, getPWAStatusDetail } from './utils/pwa.js'

const pwaInfo = detectPWA()

console.info('[boot]', {
  platform: Capacitor.getPlatform(),
  mode: import.meta.env.MODE,
  apiBase: import.meta.env.VITE_API_BASE_URL || '/api (vite proxy only in dev)',
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
  buildTime: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'unknown',
  pwa: pwaInfo
})

if (pwaInfo.installed || pwaInfo.isPWACapable) {
  console.info('[pwa] PWA 检测:\n' + getPWAStatusDetail(pwaInfo))
}

window.addEventListener('error', (event) => {
  console.error('[window.error]', event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason)
})

const app = createApp(App)
app.mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            console.info('[pwa] 新版本可用，刷新后生效')
          }
        })
      })
      console.info('[pwa] service worker registered')
    } catch (error) {
      console.error('[pwa] service worker register failed', error)
    }
  })
}
