/**
 * PDF page rendering with pdf.js, loaded on demand so the main bundle stays small. The app's CSP
 * blocks the network, so glyphs are drawn as paths (no font loading) and the optional wasm image
 * decoders are unavailable: scanned JPEG2000 / JBIG2 pages may render blank.
 */
import { MAX_EDGE } from '../../../core/image/dims'

export interface PdfDoc {
  pages: number
  /** Renders page `n` (1-based) at `scale` (1 = 72 dpi) onto a white canvas. */
  render(n: number, scale: number): Promise<HTMLCanvasElement>
  destroy(): void
}

/** Largest canvas area we ask the browser for. */
const MAX_PIXELS = 80_000_000

export class PdfPasswordError extends Error {}

export async function openPdf(data: ArrayBuffer): Promise<PdfDoc> {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker

  const task = pdfjs.getDocument({ data, disableFontFace: true })
  let doc: Awaited<typeof task.promise>
  try {
    doc = await task.promise
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') {
      throw new PdfPasswordError('This PDF is password-protected')
    }
    throw new Error('This file could not be read as a PDF')
  }

  return {
    pages: doc.numPages,
    async render(n, scale) {
      const page = await doc.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const fit = Math.min(
        scale,
        MAX_EDGE / base.width,
        MAX_EDGE / base.height,
        Math.sqrt(MAX_PIXELS / (base.width * base.height)),
      )
      const viewport = page.getViewport({ scale: fit })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is not available in this browser')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, canvas, viewport }).promise
      page.cleanup()
      return canvas
    },
    destroy: () => void task.destroy(),
  }
}
