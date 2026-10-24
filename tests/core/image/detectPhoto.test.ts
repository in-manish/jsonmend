import { describe, expect, it } from 'vitest'
import type { Rect } from '../../../src/core/image/crop'
import { detectPhotoRect, scaleRect } from '../../../src/core/image/detectPhoto'

type Rgb = [number, number, number]

/** A table-coloured picture with a "photo" on it, as pixels. `paint` can change any pixel. */
function scene(
  w: number,
  h: number,
  photo: Rect,
  opts: { table?: (x: number, y: number) => Rgb; tilt?: number } = {},
) {
  const data = new Uint8ClampedArray(w * h * 4)
  const table = opts.table ?? (() => [190, 180, 165] as Rgb)
  const cx = photo.x + photo.w / 2
  const cy = photo.y + photo.h / 2
  const [sin, cos] = [Math.sin(opts.tilt ?? 0), Math.cos(opts.tilt ?? 0)]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Map back into the unturned photo to see whether this pixel is on it.
      const u = (x - cx) * cos + (y - cy) * sin
      const v = -(x - cx) * sin + (y - cy) * cos
      const on = Math.abs(u) <= photo.w / 2 && Math.abs(v) <= photo.h / 2
      // Photo: blue wall, a face-coloured middle, and a patch close to the table colour.
      const inner = Math.abs(u) < photo.w * 0.25 && Math.abs(v) < photo.h * 0.3
      const pale = u < -photo.w * 0.3 && v < -photo.h * 0.3
      const rgb: Rgb = !on
        ? table(x, y)
        : pale
          ? [185, 178, 165]
          : inner
            ? [224, 172, 140]
            : [40, 70, 140]
      const i = (y * w + x) * 4
      data.set([...rgb, 255], i)
    }
  }
  return { data, width: w, height: h }
}

const iou = (a: Rect, b: Rect) => {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const inter = w * h
  return inter / (a.w * a.h + b.w * b.h - inter)
}

describe('detectPhotoRect', () => {
  const photo = { x: 70, y: 40, w: 90, h: 120 }

  it('finds a photo lying on a table', () => {
    const found = detectPhotoRect(scene(240, 200, photo))
    expect(found).toBeDefined()
    expect(iou(found as Rect, photo)).toBeGreaterThan(0.93)
  })

  it('copes with a table that gets darker to one side', () => {
    const shaded = (x: number): Rgb => {
      const g = 120 + (x / 240) * 90
      return [g, g * 0.95, g * 0.85]
    }
    const found = detectPhotoRect(scene(240, 200, photo, { table: shaded }))
    expect(found).toBeDefined()
    expect(iou(found as Rect, photo)).toBeGreaterThan(0.85)
  })

  it('puts a box around a slightly tilted photo', () => {
    const found = detectPhotoRect(scene(240, 200, photo, { tilt: (5 * Math.PI) / 180 }))
    expect(found).toBeDefined()
    expect(iou(found as Rect, photo)).toBeGreaterThan(0.75)
  })

  it('gives up when there is nothing to find', () => {
    // Only the table: nothing stands out.
    expect(detectPhotoRect(scene(240, 200, { x: 0, y: 0, w: 0, h: 0 }))).toBeUndefined()
    expect(
      detectPhotoRect({ data: new Uint8ClampedArray(16), width: 2, height: 2 }),
    ).toBeUndefined()
  })

  it('scales a box back to the full picture', () => {
    expect(scaleRect({ x: 10, y: 20, w: 30, h: 40 }, 4)).toEqual({ x: 40, y: 80, w: 120, h: 160 })
  })
})
