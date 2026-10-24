import { batchDims } from '../../../core/image/batch'
import { scaleDim } from '../../../core/image/dims'
import { fitToTarget } from '../../../core/image/fitToTarget'
import { toBytes } from '../../../core/image/size'
import { isLossy, loadImage } from '../lib/canvas'
import { encodeImage } from '../lib/encodeImage'
import type { ImagePrefs } from '../useImageStore'

export interface BatchOut {
  blob: Blob
  width: number
  height: number
  /** Whether the size limit was reached; undefined when no limit is set. */
  met?: boolean
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * Resizes and converts one photo with the batch settings. The decoded picture is released as soon
 * as it is encoded, so a long list does not pile up in memory. Throws a readable error for files
 * that are not images; `Cancelled` (from fitToTarget) when `signal` is set mid-search.
 */
export async function convertOne(
  file: File,
  p: ImagePrefs['batch'],
  signal: { cancelled: boolean },
): Promise<BatchOut> {
  const img = await loadImage(file).catch(() => {
    throw new Error('This is not a photo, so it was skipped')
  })
  try {
    const base = batchDims({ width: img.width, height: img.height }, p.sizeMode, p.sizeValue)
    const dpi = p.dpi > 0 ? p.dpi : undefined
    const run = async (quality: number, scale: number) => {
      await tick()
      const d = scaleDim(base, scale)
      const blob = await encodeImage(img.source, d, p.format, quality, { dpi })
      return { size: blob.size, blob, ...d }
    }
    if (!p.target.on) {
      const r = await run(p.quality / 100, 1)
      return { blob: r.blob, width: r.width, height: r.height }
    }
    const fit = await fitToTarget({
      target: toBytes(p.target.value, p.target.unit),
      lossy: isLossy(p.format),
      allowScale: p.target.allowScale,
      maxQuality: p.quality / 100,
      signal,
      encode: run,
    })
    const { blob, width, height } = fit.result
    return { blob, width, height, met: fit.met }
  } finally {
    if (img.source instanceof ImageBitmap) img.source.close()
  }
}
