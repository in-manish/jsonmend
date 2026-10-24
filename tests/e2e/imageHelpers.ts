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

/** Name and size of every file in a ZIP made by the app (stored entries), from its central directory. */
export function zipEntries(zip: Buffer) {
  const end = zip.length - 22
  expectSignature(zip, end, 0x06054b50)
  const count = zip.readUInt16LE(end + 10)
  let at = zip.readUInt32LE(end + 16)
  const entries: { name: string; size: number }[] = []
  for (let i = 0; i < count; i++) {
    expectSignature(zip, at, 0x02014b50)
    const [nameLen, extraLen, commentLen] = [28, 30, 32].map((o) => zip.readUInt16LE(at + o))
    entries.push({
      name: zip.toString('utf8', at + 46, at + 46 + nameLen),
      size: zip.readUInt32LE(at + 24),
    })
    at += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

function expectSignature(zip: Buffer, at: number, signature: number) {
  if (zip.readUInt32LE(at) !== signature) throw new Error(`Not a ZIP: no signature at ${at}`)
}

/**
 * A phone picture of a printed photo lying on a table: a table-coloured picture with a blue photo
 * (and a face-coloured oval) at `photo`. JPEG, like a camera would give.
 */
export async function makeSnapshot(
  page: Page,
  name: string,
  w: number,
  h: number,
  photo: { x: number; y: number; w: number; h: number },
) {
  const base64 = await page.evaluate(
    async ([w, h, p]) => {
      const photo = p as { x: number; y: number; w: number; h: number }
      const c = document.createElement('canvas')
      c.width = w as number
      c.height = h as number
      const ctx = c.getContext('2d') as CanvasRenderingContext2D
      ctx.fillStyle = '#beb4a5'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.fillStyle = '#28468c'
      ctx.fillRect(photo.x, photo.y, photo.w, photo.h)
      ctx.fillStyle = '#e0ac8c'
      ctx.beginPath()
      ctx.ellipse(
        photo.x + photo.w / 2,
        photo.y + photo.h * 0.42,
        photo.w * 0.22,
        photo.h * 0.28,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b as Blob), 'image/jpeg', 0.92))
      const buf = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (const b of buf) s += String.fromCharCode(b)
      return btoa(s)
    },
    [w, h, photo] as const,
  )
  return { name, mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64') }
}

/** Width and height of a JPEG, from its start-of-frame marker. */
export function jpegSize(jpeg: Buffer) {
  let at = 2
  while (at < jpeg.length) {
    const marker = jpeg[at + 1]
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: jpeg.readUInt16BE(at + 5), width: jpeg.readUInt16BE(at + 7) }
    }
    at += 2 + jpeg.readUInt16BE(at + 2)
  }
  throw new Error('Not a JPEG')
}
