import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
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
