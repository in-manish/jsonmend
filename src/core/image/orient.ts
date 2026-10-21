/**
 * Image orientation: quarter turns and flips. A flip happens in the picture's own frame first, then
 * the picture is turned clockwise. Everything here is pure geometry; the canvas applies the matrix.
 */
import type { Point, Rect } from './crop'
import type { Dim } from './dims'

export interface Orientation {
  /** Clockwise quarter turns: 0, 1 (90°), 2 (180°), 3 (270°). */
  turns: 0 | 1 | 2 | 3
  flipH: boolean
  flipV: boolean
}

export const IDENTITY: Orientation = { turns: 0, flipH: false, flipV: false }

export const isIdentity = (o: Orientation): boolean => o.turns === 0 && !o.flipH && !o.flipV

const turn = (o: Orientation, by: number): Orientation => ({
  ...o,
  turns: ((((o.turns + by) % 4) + 4) % 4) as Orientation['turns'],
})

export const rotateRight = (o: Orientation): Orientation => turn(o, 1)
export const rotateLeft = (o: Orientation): Orientation => turn(o, -1)
/**
 * Flips act on what you see. After a quarter turn the picture's own vertical axis is the screen's
 * horizontal one, so "flip left-right" toggles the other stored flag.
 */
export const flipHorizontal = (o: Orientation): Orientation =>
  swapsAxes(o) ? { ...o, flipV: !o.flipV } : { ...o, flipH: !o.flipH }
export const flipVertical = (o: Orientation): Orientation =>
  swapsAxes(o) ? { ...o, flipH: !o.flipH } : { ...o, flipV: !o.flipV }

/** Whether width and height swap. */
export const swapsAxes = (o: Orientation): boolean => o.turns % 2 === 1

/** Size of the picture after orienting it. */
export const orientedDim = (d: Dim, o: Orientation): Dim =>
  swapsAxes(o) ? { width: d.height, height: d.width } : d

export function describe(o: Orientation): string {
  const parts = []
  if (o.turns) parts.push(`rotated ${o.turns * 90}° clockwise`)
  // Flips are described as seen on screen, so a turned picture swaps which flag means which.
  const [leftRight, topBottom] = swapsAxes(o) ? [o.flipV, o.flipH] : [o.flipH, o.flipV]
  if (leftRight) parts.push('flipped left-right')
  if (topBottom) parts.push('flipped top-bottom')
  return parts.length ? parts.join(', ') : 'original orientation'
}

type Matrix = [number, number, number, number, number, number]

/**
 * The canvas transform (for `ctx.setTransform`) that draws a picture, laid out `(dw, dh)` before
 * turning, so that it fills an oriented canvas of `(W, H)` where W,H = dw,dh swapped on odd turns.
 */
export function orientMatrix(o: Orientation, dw: number, dh: number): Matrix {
  const [W, H] = swapsAxes(o) ? [dh, dw] : [dw, dh]
  const angle = (o.turns * Math.PI) / 2
  const cos = Math.round(Math.cos(angle))
  const sin = Math.round(Math.sin(angle))
  const fx = o.flipH ? -1 : 1
  const fy = o.flipV ? -1 : 1
  // translate(W/2, H/2) · rotate · scale(fx, fy) · translate(-dw/2, -dh/2)
  const a = cos * fx
  const b = sin * fx
  const c = -sin * fy
  const d = cos * fy
  return [a, b, c, d, W / 2 - (a * dw) / 2 - (c * dh) / 2, H / 2 - (b * dw) / 2 - (d * dh) / 2]
}

/** Where a point of the original picture (`src` px) lands in the oriented picture. */
export function orientPoint(p: Point, src: Dim, o: Orientation): Point {
  let x = o.flipH ? src.width - p.x : p.x
  let y = o.flipV ? src.height - p.y : p.y
  let { width: w, height: h } = src
  for (let i = 0; i < o.turns; i++) {
    ;[x, y] = [h - y, x]
    ;[w, h] = [h, w]
  }
  return { x, y }
}

/** The inverse of `orientPoint`: a point in the oriented picture back in the original. */
export function unorientPoint(p: Point, src: Dim, o: Orientation): Point {
  let { x, y } = p
  let { width: w, height: h } = orientedDim(src, o)
  for (let i = 0; i < o.turns; i++) {
    // Undo one clockwise turn: (x, y) = (h' - y0, x0) with the pre-turn size (h, w).
    ;[x, y] = [y, w - x]
    ;[w, h] = [h, w]
  }
  return { x: o.flipH ? src.width - x : x, y: o.flipV ? src.height - y : y }
}

const bounding = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
})

/** A rectangle of the original picture, as it appears in the oriented picture. */
export const rectToOriented = (r: Rect, src: Dim, o: Orientation): Rect =>
  roundRect(
    bounding(
      orientPoint({ x: r.x, y: r.y }, src, o),
      orientPoint({ x: r.x + r.w, y: r.y + r.h }, src, o),
    ),
  )

/** A rectangle drawn on the oriented picture, as it is in the original. */
export const rectFromOriented = (r: Rect, src: Dim, o: Orientation): Rect =>
  roundRect(
    bounding(
      unorientPoint({ x: r.x, y: r.y }, src, o),
      unorientPoint({ x: r.x + r.w, y: r.y + r.h }, src, o),
    ),
  )

const roundRect = (r: Rect): Rect => ({
  x: Math.round(r.x),
  y: Math.round(r.y),
  w: Math.round(r.w),
  h: Math.round(r.h),
})
