import { useEffect, useState } from 'react'
import { scaleDim } from '../../../core/image/dims'
import { Cancelled, fitToTarget } from '../../../core/image/fitToTarget'
import { buildPdf, type PdfImage } from '../../../core/image/pdfWriter'
import { toBytes } from '../../../core/image/size'
import { draw, encode, type Loaded } from '../lib/canvas'
import type { ImagePrefs } from '../useImageStore'

export interface PdfOut {
  blob: Blob
  pages: number
  quality: number
  scale: number
  met?: boolean
}

export interface PdfState {
  status: 'idle' | 'working' | 'done' | 'error'
  out?: PdfOut
  error?: string
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/** Builds the PDF from the images (debounced), searching for the size limit if one is set. */
export function useBuildPdf(images: Loaded[], prefs: ImagePrefs['imagesToPdf']): PdfState {
  const [state, setState] = useState<PdfState>({ status: 'idle' })
  const { size, margin, orientation, quality } = prefs
  const { on, value, unit, allowScale } = prefs.target

  useEffect(() => {
    if (images.length === 0) return setState({ status: 'idle' })
    const signal = { cancelled: false }
    setState((s) => ({ ...s, status: 'working', error: undefined }))

    /** One JPEG per image at the given quality and scale, wrapped in a PDF. */
    const run = async (q: number, s: number) => {
      await tick()
      const pdfImages: PdfImage[] = []
      for (const img of images) {
        const d = scaleDim({ width: img.width, height: img.height }, s)
        const jpeg = await encode(draw(img.source, d.width, d.height, true), 'image/jpeg', q)
        pdfImages.push({ jpeg: new Uint8Array(await jpeg.arrayBuffer()), ...d })
      }
      const bytes = buildPdf(pdfImages, { size, margin, orientation })
      return {
        size: bytes.length,
        blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
      }
    }

    const timer = setTimeout(async () => {
      try {
        let out: PdfOut
        if (on) {
          const fit = await fitToTarget({
            target: toBytes(value, unit),
            lossy: true,
            allowScale,
            maxQuality: quality / 100,
            signal,
            encode: run,
          })
          out = {
            blob: fit.result.blob,
            pages: images.length,
            quality: fit.quality,
            scale: fit.scale,
            met: fit.met,
          }
        } else {
          const r = await run(quality / 100, 1)
          out = { blob: r.blob, pages: images.length, quality: quality / 100, scale: 1 }
        }
        if (!signal.cancelled) setState({ status: 'done', out })
      } catch (err) {
        if (err instanceof Cancelled || signal.cancelled) return
        setState({
          status: 'error',
          error: err instanceof Error ? err.message : 'Could not build the PDF',
        })
      }
    }, 300)

    return () => {
      signal.cancelled = true
      clearTimeout(timer)
    }
  }, [images, size, margin, orientation, quality, on, value, unit, allowScale])

  return state
}
