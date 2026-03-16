import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

/**
 * 构建后自动把资源列表注入 sw.js，不依赖运行时 fetch manifest
 */
function injectSwAssets() {
  return {
    name: 'inject-sw-assets',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      const manifestPath = resolve(distDir, '.vite/manifest.json')
      const swPath = resolve(distDir, 'sw.js')

      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        const files = new Set()
        Object.values(manifest).forEach((entry) => {
          if (entry.file) files.add(`./${entry.file}`)
          if (Array.isArray(entry.css)) entry.css.forEach((f) => files.add(`./${f}`))
          if (Array.isArray(entry.assets)) entry.assets.forEach((f) => files.add(`./${f}`))
        })

        const assetList = JSON.stringify([...files])
        let sw = readFileSync(swPath, 'utf-8')
        sw = sw.replace('/*__BUILD_ASSETS__*/[]', assetList)
        writeFileSync(swPath, sw, 'utf-8')

        console.log(`[inject-sw] 注入 ${files.size} 个构建资源到 sw.js`)
      } catch (error) {
        console.error('[inject-sw] 注入失败:', error.message)
      }
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [vue(), injectSwAssets()],
  build: {
    manifest: true
  },
  server: {
    host: true,
    port: 5180
  },
  preview: {
    host: true,
    port: 4180
  }
})
