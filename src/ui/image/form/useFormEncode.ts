import { useEffect, useState } from 'react'
import type { Rect } from '../../../core/image/crop'
import { Cancelled, fitToTarget } from '../../../core/image/fitToTarget'
import { type FormDoc, limitsBytes } from '../../../core/image/formPresets'
import { padJpeg } from '../../../core/image/jpegPad'
import type { Loaded } from '../lib/canvas'
import { encodeImage } from '../lib/encodeImage'

export interface FormOut {
  blob: Blob
  /** Inside the form's file size window. */
  met: boolean
}

export interface FormEncode {
  status: 'working' | 'done' | 'error'
  out?: FormOut
  error?: string
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * The chosen part of the photo as exactly the form's size: the best JPG quality that stays under
 * the form's maximum, padded up to its minimum when the picture is too small to get there alone.
 */
export function useFormEncode(img: Loaded, doc: FormDoc, crop: Rect | undefined): FormEncode {
  const [state, setState] = useState<FormEncode>({ status: 'working' })
  const [x, y, w, h] = [crop?.x, crop?.y, crop?.w, crop?.h]

  useEffect(() => {
    const signal = { cancelled: false }
    const { min, max } = limitsBytes(doc)
    const region =
      x === undefined ? undefined : { x, y: y as number, w: w as number, h: h as number }
    setState((s) => ({ ...s, status: 'working' }))

    const timer = setTimeout(async () => {
      try {
        const fit = await fitToTarget({
          target: max,
          lossy: true,
          allowScale: false,
          maxQuality: 0.95,
          signal,
          encode: async (quality) => {
            await tick()
            const blob = await encodeImage(
              img.source,
              { width: doc.width, height: doc.height },
              'jpeg',
              quality,
              { crop: region },
            )
            return { size: blob.size, blob }
          },
        })
        let { blob } = fit.result
        if (fit.met && blob.size < min) {
          const padded = padJpeg(new Uint8Array(await blob.arrayBuffer()), min)
          blob = new Blob([padded as BlobPart], { type: 'image/jpeg' })
        }
        if (!signal.cancelled) setState({ status: 'done', out: { blob, met: fit.met } })
      } catch (err) {
        if (err instanceof Cancelled || signal.cancelled) return
        setState({
          status: 'error',
          error: err instanceof Error ? err.message : 'Could not make the photo',
        })
      }
    }, 200)

    return () => {
      signal.cancelled = true
      clearTimeout(timer)
    }
  }, [img, doc, x, y, w, h])

  return state
}
