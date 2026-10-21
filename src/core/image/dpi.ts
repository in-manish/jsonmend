/**
 * Writes the print resolution (dots per inch) into JPEG and PNG files. Canvas encoders leave it
 * at the default, so a "4 × 6 inch at 300 dpi" image would otherwise open at the wrong print size.
 * Only the metadata changes; the pixels are untouched.
 */
import { crc32 } from './zip'

const JFIF = [0x4a, 0x46, 0x49, 0x46, 0x00]

/** Sets units = dots per inch and the density in a JPEG's JFIF header (adding the header if absent). */
export function setJpegDpi(jpeg: Uint8Array, dpi: number): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg
  const d = Math.min(65535, Math.max(1, Math.round(dpi)))
  const hi = d >> 8
  const lo = d & 0xff
  const hasJfif = jpeg[2] === 0xff && jpeg[3] === 0xe0 && JFIF.every((b, i) => jpeg[6 + i] === b)
  if (hasJfif) {
    const out = jpeg.slice()
    out[13] = 1
    out.set([hi, lo, hi, lo], 14)
    return out
  }
  const segment = [0xff, 0xe0, 0x00, 0x10, ...JFIF, 0x01, 0x01, 0x01, hi, lo, hi, lo, 0x00, 0x00]
  const out = new Uint8Array(jpeg.length + segment.length)
  out.set(jpeg.subarray(0, 2), 0)
  out.set(segment, 2)
  out.set(jpeg.subarray(2), 2 + segment.length)
  return out
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Replaces (or adds) the pHYs chunk of a PNG with the density in pixels per metre. */
export function setPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  if (!PNG_SIGNATURE.every((b, i) => png[i] === b)) return png
  const perMetre = Math.round(dpi / 0.0254)
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)

  // Chunks after the signature, dropping any existing pHYs.
  const kept: Uint8Array[] = []
  let ihdrEnd = 8
  for (let at = 8; at + 12 <= png.length; ) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    const end = at + 12 + length
    if (type !== 'pHYs') kept.push(png.subarray(at, end))
    if (type === 'IHDR') ihdrEnd = kept.length
    at = end
  }

  const chunk = new Uint8Array(21)
  const cv = new DataView(chunk.buffer)
  cv.setUint32(0, 9)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4) // "pHYs"
  cv.setUint32(8, perMetre)
  cv.setUint32(12, perMetre)
  chunk[16] = 1 // unit: metre
  cv.setUint32(17, crc32(chunk.subarray(4, 17)))

  const parts = [
    new Uint8Array(PNG_SIGNATURE),
    ...kept.slice(0, ihdrEnd),
    chunk,
    ...kept.slice(ihdrEnd),
  ]
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** The density stored in a JPEG / PNG, in dpi (for tests and display). */
export function readDpi(bytes: Uint8Array): number | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return bytes[13] === 1 && JFIF.every((b, i) => bytes[6 + i] === b)
      ? view.getUint16(14)
      : undefined
  }
  for (let at = 8; at + 12 <= bytes.length; at += 12 + view.getUint32(at)) {
    if (String.fromCharCode(...bytes.subarray(at + 4, at + 8)) === 'pHYs') {
      return Math.round(view.getUint32(at + 8) * 0.0254)
    }
  }
  return undefined
}
