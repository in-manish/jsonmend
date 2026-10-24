import { clampRect, type Rect } from '../../../core/image/crop'
import { detectPhotoRect, scaleRect } from '../../../core/image/detectPhoto'
import { draw, type Loaded } from './canvas'

/** Detection runs on a small copy: edges do not need megapixels, and this stays instant. */
const SIDE = 220

/**
 * Where the printed photo is inside a picture taken of it (a phone shot of a photo on a table),
 * in pixels of the full picture; undefined when no clear edge is found.
 */
export function findPhotoEdges(img: Loaded): Rect | undefined {
  const k = Math.min(1, SIDE / Math.max(img.width, img.height))
  const [w, h] = [Math.max(16, Math.round(img.width * k)), Math.max(16, Math.round(img.height * k))]
  const ctx = draw(img.source, w, h, true).getContext('2d')
  if (!ctx) return undefined
  const found = detectPhotoRect(ctx.getImageData(0, 0, w, h))
  return (
    found && clampRect(scaleRect(found, img.width / w), { width: img.width, height: img.height })
  )
}
