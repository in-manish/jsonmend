import { useEffect, useState } from 'react'
import { type Orientation, orientedDim } from '../../../core/image/orient'
import { draw, encode, type Loaded } from './canvas'
import { useObjectUrl } from './useObjectUrl'

/** Longest edge of the preview; crop coordinates map back to the full size, so this can be small. */
const PREVIEW_EDGE = 1600

/**
 * A blob: URL of the whole image turned / flipped as the user chose, for the crop view (so they
 * crop what they see). Undefined while it renders.
 */
export function useOrientedUrl(img: Loaded | undefined, o: Orientation): string | undefined {
  const [blob, setBlob] = useState<Blob>()
  const { turns, flipH, flipV } = o
  useEffect(() => {
    if (!img) return setBlob(undefined)
    let cancelled = false
    const full = orientedDim({ width: img.width, height: img.height }, { turns, flipH, flipV })
    const k = Math.min(1, PREVIEW_EDGE / Math.max(full.width, full.height))
    const w = Math.max(1, Math.round(full.width * k))
    const h = Math.max(1, Math.round(full.height * k))
    encode(draw(img.source, w, h, false, undefined, { turns, flipH, flipV }), 'image/png', 1)
      .then((b) => !cancelled && setBlob(b))
      .catch(() => !cancelled && setBlob(undefined))
    return () => {
      cancelled = true
    }
  }, [img, turns, flipH, flipV])
  return useObjectUrl(blob)
}
