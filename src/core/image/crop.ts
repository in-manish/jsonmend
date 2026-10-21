/**
 * Crop rectangle math in image pixels. The UI turns pointer positions into pixel deltas; these
 * functions keep the rectangle inside the image, above a minimum size, and on an aspect ratio.
 */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  width: number
  height: number
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/** Smallest crop edge, in pixels. */
export const MIN_CROP = 8

const round = (r: Rect): Rect => ({
  x: Math.round(r.x),
  y: Math.round(r.y),
  w: Math.round(r.w),
  h: Math.round(r.h),
})

export const fullRect = (b: Bounds): Rect => ({ x: 0, y: 0, w: b.width, h: b.height })

/** Inside the image, at least MIN_CROP wide and tall (or the whole image if it is smaller). */
export function clampRect(r: Rect, b: Bounds): Rect {
  const min = (edge: number) => Math.min(MIN_CROP, edge)
  const w = Math.min(Math.max(r.w, min(b.width)), b.width)
  const h = Math.min(Math.max(r.h, min(b.height)), b.height)
  return round({
    x: Math.min(Math.max(r.x, 0), b.width - w),
    y: Math.min(Math.max(r.y, 0), b.height - h),
    w,
    h,
  })
}

export function moveRect(r: Rect, dx: number, dy: number, b: Bounds): Rect {
  return clampRect({ ...r, x: r.x + dx, y: r.y + dy }, b)
}

/**
 * A rectangle with one corner at `anchor` and the opposite corner dragged to `target`. With an
 * `aspect` (width / height) the longer side wins and the other follows; the rectangle never leaves
 * the image.
 */
export function fromAnchor(anchor: Point, target: Point, b: Bounds, aspect?: number): Rect {
  const sx = target.x >= anchor.x ? 1 : -1
  const sy = target.y >= anchor.y ? 1 : -1
  const maxW = sx > 0 ? b.width - anchor.x : anchor.x
  const maxH = sy > 0 ? b.height - anchor.y : anchor.y
  let w = Math.min(Math.abs(target.x - anchor.x), maxW)
  let h = Math.min(Math.abs(target.y - anchor.y), maxH)
  if (aspect) {
    if (w / aspect >= h) h = w / aspect
    else w = h * aspect
    if (w > maxW) {
      w = maxW
      h = w / aspect
    }
    if (h > maxH) {
      h = maxH
      w = h * aspect
    }
  }
  return round({ x: sx > 0 ? anchor.x : anchor.x - w, y: sy > 0 ? anchor.y : anchor.y - h, w, h })
}

/** Dragging a new rectangle from `a` to `p`. */
export const dragNewRect = (a: Point, p: Point, b: Bounds, aspect?: number): Rect =>
  fromAnchor(a, p, b, aspect)

/** Moves one handle of `r` by (dx, dy) image pixels. */
export function resizeRect(
  r: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  b: Bounds,
  aspect?: number,
): Rect {
  const left = r.x
  const right = r.x + r.w
  const top = r.y
  const bottom = r.y + r.h
  const west = handle.includes('w')
  const east = handle.includes('e')
  const north = handle.includes('n')
  const south = handle.includes('s')

  if (handle.length === 2) {
    // Corner: the opposite corner stays put.
    const anchor = { x: west ? right : left, y: north ? bottom : top }
    const moved = { x: (west ? left : right) + dx, y: (north ? top : bottom) + dy }
    return enforceMin(fromAnchor(anchor, moved, b, aspect), anchor, b, aspect)
  }

  if (!aspect) {
    const l = west ? Math.min(left + dx, right - MIN_CROP) : left
    const rr = east ? Math.max(right + dx, left + MIN_CROP) : right
    const t = north ? Math.min(top + dy, bottom - MIN_CROP) : top
    const bo = south ? Math.max(bottom + dy, top + MIN_CROP) : bottom
    return clampRect({ x: l, y: t, w: rr - l, h: bo - t }, b)
  }

  // Edge with a fixed ratio: that side moves, the other side grows around the middle.
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  if (east || west) {
    const edge = east ? right + dx : left + dx
    let w = Math.max(east ? edge - left : right - edge, MIN_CROP)
    w = Math.min(w, east ? b.width - left : right, 2 * Math.min(cy, b.height - cy) * aspect)
    const h = w / aspect
    return round({ x: east ? left : right - w, y: cy - h / 2, w, h })
  }
  const edge = south ? bottom + dy : top + dy
  let h = Math.max(south ? edge - top : bottom - edge, MIN_CROP)
  h = Math.min(h, south ? b.height - top : bottom, (2 * Math.min(cx, b.width - cx)) / aspect)
  const w = h * aspect
  return round({ x: cx - w / 2, y: south ? top : bottom - h, w, h })
}

/** Grows a too-small corner drag to the minimum size, away from the anchor. */
function enforceMin(r: Rect, anchor: Point, b: Bounds, aspect?: number): Rect {
  if (r.w >= MIN_CROP && r.h >= MIN_CROP) return r
  const dirX =
    r.x < anchor.x ? -1 : r.x + r.w > anchor.x ? 1 : anchor.x + MIN_CROP <= b.width ? 1 : -1
  const dirY =
    r.y < anchor.y ? -1 : r.y + r.h > anchor.y ? 1 : anchor.y + MIN_CROP <= b.height ? 1 : -1
  const w = Math.max(r.w, MIN_CROP)
  const h = aspect ? Math.max(r.h, w / aspect) : Math.max(r.h, MIN_CROP)
  return clampRect(
    { x: dirX > 0 ? anchor.x : anchor.x - w, y: dirY > 0 ? anchor.y : anchor.y - h, w, h },
    b,
  )
}

/** Shrinks `r` around its center to the aspect ratio (width / height). */
export function fitAspect(r: Rect, aspect: number, b: Bounds): Rect {
  let w = r.w
  let h = r.h
  if (w / h > aspect) w = h * aspect
  else h = w / aspect
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  return clampRect({ x: cx - w / 2, y: cy - h / 2, w, h }, b)
}

/** A centered starting crop (80% of the image, on the ratio if given). */
export function defaultRect(b: Bounds, aspect?: number): Rect {
  const base = { x: b.width * 0.1, y: b.height * 0.1, w: b.width * 0.8, h: b.height * 0.8 }
  return aspect ? fitAspect(round(base), aspect, b) : clampRect(base, b)
}

export const CROP_PRESETS: { id: string; label: string; ratio: number | 'original' | undefined }[] =
  [
    { id: 'free', label: 'Any shape', ratio: undefined },
    { id: 'original', label: 'Original', ratio: 'original' },
    { id: '1:1', label: 'Square 1:1', ratio: 1 },
    { id: '4:3', label: '4:3', ratio: 4 / 3 },
    { id: '3:4', label: '3:4', ratio: 3 / 4 },
    { id: '3:2', label: '3:2', ratio: 3 / 2 },
    { id: '16:9', label: 'Wide 16:9', ratio: 16 / 9 },
    { id: '9:16', label: 'Story 9:16', ratio: 9 / 16 },
  ]

export const presetAspect = (id: string, b: Bounds): number | undefined => {
  const ratio = CROP_PRESETS.find((p) => p.id === id)?.ratio
  return ratio === 'original' ? b.width / b.height : ratio
}
