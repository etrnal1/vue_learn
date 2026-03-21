import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3100',
      '/': { target: 'ws://localhost:3100', ws: true, changeOrigin: true },
    }
  }
})
