import type { Page } from '@playwright/test'

/** A noisy (so it compresses meaningfully) image made in the page, returned as a file payload. */
export async function makeImage(page: Page, name: string, w: number, h: number, type: string) {
  const base64 = await page.evaluate(
    async ([w, h, type]) => {
      const c = document.createElement('canvas')
      c.width = w as number
      c.height = h as number
      const ctx = c.getContext('2d') as CanvasRenderingContext2D
      const data = ctx.createImageData(c.width, c.height)
      for (let i = 0; i < data.data.length; i += 4) {
        const v = (i / 4) % 251
        data.data[i] = v
        data.data[i + 1] = (v * 7) % 256
        data.data[i + 2] = Math.floor(Math.random() * 256)
        data.data[i + 3] = 255
      }
      ctx.putImageData(data, 0, 0)
      const blob: Blob = await new Promise((r) =>
        c.toBlob((b) => r(b as Blob), type as string, 0.95),
      )
      const buf = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (const b of buf) s += String.fromCharCode(b)
      return btoa(s)
    },
    [w, h, type] as const,
  )
  return { name, mimeType: type, buffer: Buffer.from(base64, 'base64') }
}

export const readDownload = async (page: Page, click: () => Promise<void>) => {
  const [download] = await Promise.all([page.waitForEvent('download'), click()])
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(c as Buffer)
  return { name: download.suggestedFilename(), data: Buffer.concat(chunks) }
}

/** A PNG with red / green / blue / yellow quadrants (top-left, top-right, bottom-left, bottom-right). */
export async function makeQuadrants(page: Page, name: string, w: number, h: number) {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const c = document.createElement('canvas')
      c.width = w as number
      c.height = h as number
      const ctx = c.getContext('2d') as CanvasRenderingContext2D
      const colors = ['#f00', '#0f0', '#00f', '#ff0']
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = colors[i]
        ctx.fillRect(
          ((i % 2) * c.width) / 2,
          (Math.floor(i / 2) * c.height) / 2,
          c.width / 2,
          c.height / 2,
        )
      }
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b as Blob), 'image/png'))
      const buf = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (const b of buf) s += String.fromCharCode(b)
      return btoa(s)
    },
    [w, h] as const,
  )
  return { name, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') }
}

/** The RGB colour of pixel (x, y) of a PNG, decoded in the page. */
export async function pixelAt(page: Page, png: Buffer, x: number, y: number) {
  return page.evaluate(
    async ([b64, x, y]) => {
      const bin = atob(b64 as string)
      const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
      const c = document.createElement('canvas')
      c.width = bmp.width
      c.height = bmp.height
      const ctx = c.getContext('2d') as CanvasRenderingContext2D
      ctx.drawImage(bmp, 0, 0)
      const d = ctx.getImageData(x as number, y as number, 1, 1).data
      return [d[0], d[1], d[2]]
    },
    [png.toString('base64'), x, y] as const,
  )
}
