import { describe, expect, it } from 'vitest'
import {
  clampRect,
  defaultRect,
  dragNewRect,
  fitAspect,
  fullRect,
  MIN_CROP,
  moveRect,
  presetAspect,
  resizeRect,
} from '../../../src/core/image/crop'

const B = { width: 1000, height: 800 }
const inside = (r: { x: number; y: number; w: number; h: number }) =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= B.width && r.y + r.h <= B.height

describe('crop math', () => {
  it('clamps into the image and above the minimum', () => {
    expect(clampRect({ x: -50, y: 900, w: 2000, h: 1 }, B)).toEqual({
      x: 0,
      y: 792,
      w: 1000,
      h: MIN_CROP,
    })
    expect(clampRect({ x: 10, y: 10, w: 100, h: 100 }, B)).toEqual({ x: 10, y: 10, w: 100, h: 100 })
  })

  it('moves without leaving the image or changing size', () => {
    expect(moveRect({ x: 100, y: 100, w: 200, h: 100 }, 5000, -5000, B)).toEqual({
      x: 800,
      y: 0,
      w: 200,
      h: 100,
    })
  })

  it('draws a new rectangle in any direction', () => {
    expect(dragNewRect({ x: 100, y: 100 }, { x: 300, y: 250 }, B)).toEqual({
      x: 100,
      y: 100,
      w: 200,
      h: 150,
    })
    expect(dragNewRect({ x: 300, y: 250 }, { x: 100, y: 100 }, B)).toEqual({
      x: 100,
      y: 100,
      w: 200,
      h: 150,
    })
    expect(inside(dragNewRect({ x: 900, y: 700 }, { x: 5000, y: 5000 }, B))).toBe(true)
  })

  it('keeps a ratio while drawing, using the longer side and staying inside', () => {
    const sq = dragNewRect({ x: 100, y: 100 }, { x: 400, y: 200 }, B, 1)
    expect(sq).toEqual({ x: 100, y: 100, w: 300, h: 300 })
    const wide = dragNewRect({ x: 500, y: 500 }, { x: 5000, y: 5000 }, B, 2)
    expect(wide.w / wide.h).toBeCloseTo(2, 1)
    expect(inside(wide)).toBe(true)
  })

  it('resizes by a corner with the opposite corner fixed', () => {
    const r = { x: 200, y: 200, w: 300, h: 200 }
    expect(resizeRect(r, 'se', 100, 50, B)).toEqual({ x: 200, y: 200, w: 400, h: 250 })
    expect(resizeRect(r, 'nw', -100, -50, B)).toEqual({ x: 100, y: 150, w: 400, h: 250 })
    expect(resizeRect(r, 'se', -5000, -5000, B).w).toBeGreaterThanOrEqual(MIN_CROP)
  })

  it('resizes by an edge', () => {
    const r = { x: 200, y: 200, w: 300, h: 200 }
    expect(resizeRect(r, 'e', 100, 999, B)).toEqual({ x: 200, y: 200, w: 400, h: 200 })
    expect(resizeRect(r, 'n', 0, -100, B)).toEqual({ x: 200, y: 100, w: 300, h: 300 })
    expect(inside(resizeRect(r, 'w', -5000, 0, B))).toBe(true)
  })

  it('keeps the ratio when resizing by corner or edge', () => {
    const r = { x: 200, y: 200, w: 300, h: 300 }
    const corner = resizeRect(r, 'se', 100, 20, B, 1)
    expect(corner.w).toBe(corner.h)
    const edge = resizeRect(r, 'e', 100, 0, B, 1)
    expect(edge.w).toBe(edge.h)
    expect(edge.w).toBe(400)
    expect(inside(edge)).toBe(true)
  })

  it('fits a ratio around the center and offers presets', () => {
    expect(fitAspect({ x: 0, y: 0, w: 400, h: 200 }, 1, B)).toEqual({
      x: 100,
      y: 0,
      w: 200,
      h: 200,
    })
    expect(presetAspect('original', B)).toBe(1.25)
    expect(presetAspect('free', B)).toBeUndefined()
    expect(presetAspect('16:9', B)).toBeCloseTo(16 / 9)
    expect(defaultRect(B)).toEqual({ x: 100, y: 80, w: 800, h: 640 })
    expect(fullRect(B)).toEqual({ x: 0, y: 0, w: 1000, h: 800 })
  })
})
