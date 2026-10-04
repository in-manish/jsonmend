import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/** Headers for `/*` from public/_headers, so `vite preview` (and the E2E tests) run under the production CSP. */
function productionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  let inRoot = false
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue
    if (!line.startsWith(' ')) {
      inRoot = line.trim() === '/*'
      continue
    }
    const sep = line.indexOf(':')
    if (inRoot && sep > 0) headers[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
  }
  return headers
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  build: {
    // React + CodeMirror are one ~240 KB (gzip) chunk; the core runs in its own worker chunk.
    chunkSizeWarningLimit: 900,
  },
  preview: { headers: productionHeaders() },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
