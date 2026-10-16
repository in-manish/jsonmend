import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'
import { ROUTES } from './src/routes.ts'

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

/**
 * Static hosts (GitHub Pages) have no SPA fallback, so every tool path gets its own copy of the
 * built page, with its own title and description for link previews. 404.html covers anything else.
 */
function toolPages(): Plugin {
  return {
    name: 'tool-pages',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const index = bundle['index.html']
        if (index?.type !== 'asset') return
        const html = String(index.source)
        const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        for (const r of ROUTES) {
          const page = html
            .replace(/<title>.*?<\/title>/, `<title>${esc(r.title)} · jsonmend</title>`)
            .replace(
              '</head>',
              `  <meta name="description" content="${esc(r.description)}" />\n  </head>`,
            )
          this.emitFile({ type: 'asset', fileName: `${r.slug}/index.html`, source: page })
        }
        this.emitFile({ type: 'asset', fileName: '404.html', source: html })
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), toolPages()],
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
