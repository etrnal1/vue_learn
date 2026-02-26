import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const buildTime = new Date().toISOString()

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(buildTime)
  },
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('echarts') || id.includes('zrender') || id.includes('vue-echarts')) {
            return 'vendor-echarts'
          }
          return 'vendor'
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    open: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '*.local',
      'macdemac-mini.taileeb849.ts.net'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
