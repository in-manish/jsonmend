import type { Rect } from '../../../core/image/crop'
import type { Dim } from '../../../core/image/dims'
import { setJpegDpi, setPngDpi } from '../../../core/image/dpi'
import type { Orientation } from '../../../core/image/orient'
import { draw, encode, LABEL, MIME, type OutFormat } from './canvas'

export interface EncodeOptions {
  /** Print resolution to write into JPG / PNG output. */
  dpi?: number
  /** Region of the source to keep (source pixels). */
  crop?: Rect
  /** Turns and flips, applied after the crop. */
  orient?: Orientation
}

/** Draws `source` at `size`, encodes it as `format` at `quality` (0..1), and tags the dpi. */
export async function encodeImage(
  source: CanvasImageSource,
  size: Dim,
  format: OutFormat,
  quality: number,
  { dpi, crop, orient }: EncodeOptions = {},
): Promise<Blob> {
  const canvas = draw(source, size.width, size.height, format === 'jpeg', crop, orient)
  const blob = await encode(canvas, MIME[format], quality)
  if (blob.type !== MIME[format]) throw new Error(`This browser cannot encode ${LABEL[format]}`)
  if (dpi && (format === 'jpeg' || format === 'png')) {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const tagged = format === 'jpeg' ? setJpegDpi(bytes, dpi) : setPngDpi(bytes, dpi)
    return new Blob([tagged as BlobPart], { type: MIME[format] })
  }
  return blob
}
