import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import App from './App.vue'
import './style.css'
import './ios-unified.css'

console.info('[boot]', {
  platform: Capacitor.getPlatform(),
  mode: import.meta.env.MODE,
  apiBase: import.meta.env.VITE_API_BASE_URL || '/api (vite proxy only in dev)',
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
  buildTime: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'unknown'
})

window.addEventListener('error', (event) => {
  console.error('[window.error]', event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason)
})

const app = createApp(App)
app.mount('#app')
