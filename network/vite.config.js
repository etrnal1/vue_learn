import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5200,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3100'
    }
  }
})
