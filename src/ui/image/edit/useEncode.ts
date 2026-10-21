import { useEffect, useState } from 'react'
import type { Rect } from '../../../core/image/crop'
import type { Dim } from '../../../core/image/dims'
import { scaleDim } from '../../../core/image/dims'
import { setJpegDpi, setPngDpi } from '../../../core/image/dpi'
import { Cancelled, fitToTarget } from '../../../core/image/fitToTarget'
import type { Orientation } from '../../../core/image/orient'
import { toBytes } from '../../../core/image/size'
import { draw, encode, isLossy, type Loaded, MIME } from '../lib/canvas'
import type { ImagePrefs } from '../useImageStore'

export interface EncodeOut {
  blob: Blob
  width: number
  height: number
  /** Quality actually used (0..1); PNG ignores it. */
  quality: number
  /** Fraction of the chosen dimensions that was kept (1 = unchanged). */
  scale: number
  /** Whether the size limit was reached; undefined when no limit is set. */
  met?: boolean
  tries: number
}

export interface EncodeState {
  status: 'idle' | 'working' | 'done' | 'error'
  /** Latest finished result; kept while a new one is being computed. */
  out?: EncodeOut
  error?: string
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/** Encodes `img` at `dims` with the chosen settings (debounced), searching for the size limit if set. */
export function useEncode(
  img: Loaded | undefined,
  dims: Dim | undefined,
  edit: ImagePrefs['edit'],
  /** Region of the image to keep (source pixels); the whole image if absent. */
  crop?: Rect,
  /** Print resolution to write into JPEG / PNG output; omitted when not wanted. */
  dpi?: number,
  /** Turns and flips, applied after the crop. */
  orient?: Orientation,
): EncodeState {
  const [state, setState] = useState<EncodeState>({ status: 'idle' })
  const { format, quality } = edit
  const { on, value, unit, allowScale } = edit.target
  const width = dims?.width
  const height = dims?.height
  const [turns, flipH, flipV] = [orient?.turns, orient?.flipH, orient?.flipV]
  const [cx, cy, cw, ch] = [crop?.x, crop?.y, crop?.w, crop?.h]

  useEffect(() => {
    if (!img || !width || !height) return setState({ status: 'idle' })
    const signal = { cancelled: false }
    const base = { width, height }
    const lossy = isLossy(format)
    setState((s) => ({ ...s, status: 'working', error: undefined }))

    const run = async (q: number, s: number) => {
      await tick()
      const d = scaleDim(base, s)
      const region =
        cx === undefined ? undefined : { x: cx, y: cy as number, w: cw as number, h: ch as number }
      const orientation =
        turns === undefined ? undefined : { turns, flipH: !!flipH, flipV: !!flipV }
      let blob = await encode(
        draw(img.source, d.width, d.height, format === 'jpeg', region, orientation),
        MIME[format],
        q,
      )
      if (blob.type !== MIME[format])
        throw new Error(`This browser cannot encode ${format.toUpperCase()}`)
      if (dpi && (format === 'jpeg' || format === 'png')) {
        const bytes = new Uint8Array(await blob.arrayBuffer())
        const tagged = format === 'jpeg' ? setJpegDpi(bytes, dpi) : setPngDpi(bytes, dpi)
        blob = new Blob([tagged as BlobPart], { type: MIME[format] })
      }
      return { size: blob.size, blob, width: d.width, height: d.height }
    }

    const timer = setTimeout(async () => {
      try {
        let out: EncodeOut
        if (on) {
          const fit = await fitToTarget({
            target: toBytes(value, unit),
            lossy,
            allowScale,
            maxQuality: quality / 100,
            signal,
            encode: run,
          })
          out = {
            ...fit.result,
            quality: fit.quality,
            scale: fit.scale,
            met: fit.met,
            tries: fit.tries,
          }
        } else {
          const r = await run(quality / 100, 1)
          out = { ...r, quality: quality / 100, scale: 1, tries: 1 }
        }
        if (!signal.cancelled) setState({ status: 'done', out })
      } catch (err) {
        if (err instanceof Cancelled || signal.cancelled) return
        setState({ status: 'error', error: err instanceof Error ? err.message : 'Encoding failed' })
      }
    }, 250)

    return () => {
      signal.cancelled = true
      clearTimeout(timer)
    }
  }, [
    img,
    width,
    height,
    format,
    quality,
    on,
    value,
    unit,
    allowScale,
    cx,
    cy,
    cw,
    ch,
    dpi,
    turns,
    flipH,
    flipV,
  ])

  return state
}
