import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/tx-ledger/',
  resolve: { alias: { '@': fileURLToPath(new URL('src', import.meta.url)) } },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
})
