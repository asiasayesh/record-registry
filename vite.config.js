import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: '/tx-ledger/',
  resolve: { alias: { '@': fileURLToPath(new URL('src', import.meta.url)) } },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
})
