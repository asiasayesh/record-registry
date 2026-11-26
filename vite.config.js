import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: '/record-registry/',
  resolve: { alias: { '@': fileURLToPath(new URL('src', import.meta.url)) } },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
})
