/** Browser image plumbing: decode a file, draw it at a size, encode it. Everything stays local. */

export type OutFormat = 'jpeg' | 'png' | 'webp' | 'avif'

export const MIME: Record<OutFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}
export const EXTENSION: Record<OutFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
}
export const LABEL: Record<OutFormat, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
}

/** Formats whose size responds to the quality setting. */
export const isLossy = (f: OutFormat) => f !== 'png'

export interface Loaded {
  source: CanvasImageSource
  width: number
  height: number
  name: string
  /** MIME type of the file as chosen, e.g. image/png. */
  type: string
  bytes: number
}

/** Decodes an image file (EXIF rotation applied). Throws a readable error if it is not an image. */
export async function loadImage(file: File): Promise<Loaded> {
  const base = { name: file.name, type: file.type || 'image', bytes: file.size }
  try {
    const bitmap = await createImageBitmap(file)
    return { ...base, source: bitmap, width: bitmap.width, height: bitmap.height }
  } catch {
    // SVG and a few other types decode through an <img> instead.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return { ...base, source: img, width: img.naturalWidth, height: img.naturalHeight }
    } catch {
      throw new Error(`${file.name} could not be read as an image`)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/** Draws `source` at the given size; `flatten` paints white first (JPEG has no transparency). */
export function draw(
  source: CanvasImageSource,
  width: number,
  height: number,
  flatten: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser')
  if (flatten) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

export function encode(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('This browser could not encode the image')),
      mime,
      quality,
    )
  })
}

let avifSupport: Promise<boolean> | undefined
/** Chrome encodes AVIF from canvas; others silently fall back to PNG, which this detects. */
export function supportsAvif(): Promise<boolean> {
  avifSupport ??= (async () => {
    try {
      const probe = document.createElement('canvas')
      probe.width = probe.height = 1
      const blob = await encode(probe, MIME.avif, 0.5)
      return blob.type === MIME.avif
    } catch {
      return false
    }
  })()
  return avifSupport
}

export const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'image'

/** "image/png" -> "PNG", "image/svg+xml" -> "SVG". */
export const typeLabel = (type: string) =>
  (type.split('/')[1] ?? type).replace(/\+.*$/, '').replace('jpeg', 'jpg').toUpperCase()
