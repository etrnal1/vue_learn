import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import './features/notes/notesDb.js'

const app = createApp(App)
app.mount('#app')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js')
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    } catch (error) {
      console.error('[pwa] service worker register failed', error)
    }
  })
}
