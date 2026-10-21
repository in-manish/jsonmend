import { describe, expect, it } from 'vitest'
import {
  describe as describeOrientation,
  flipHorizontal,
  flipVertical,
  IDENTITY,
  isIdentity,
  type Orientation,
  orientedDim,
  orientMatrix,
  orientPoint,
  rectFromOriented,
  rectToOriented,
  rotateLeft,
  rotateRight,
  unorientPoint,
} from '../../../src/core/image/orient'

const SRC = { width: 400, height: 300 }
const all: Orientation[] = []
for (const turns of [0, 1, 2, 3] as const)
  for (const flipH of [false, true])
    for (const flipV of [false, true]) all.push({ turns, flipH, flipV })

/** Applies a canvas matrix to a point. */
const apply = (m: number[], x: number, y: number) => ({
  x: m[0] * x + m[2] * y + m[4],
  y: m[1] * x + m[3] * y + m[5],
})

describe('orientation state', () => {
  it('turns and flips', () => {
    expect(rotateRight(IDENTITY).turns).toBe(1)
    expect(rotateLeft(IDENTITY).turns).toBe(3)
    expect(rotateRight(rotateRight(rotateRight(rotateRight(IDENTITY))))).toEqual(IDENTITY)
    expect(flipHorizontal(flipHorizontal(IDENTITY))).toEqual(IDENTITY)
    expect(flipVertical(IDENTITY).flipV).toBe(true)
    expect(isIdentity(IDENTITY)).toBe(true)
    expect(isIdentity(rotateRight(IDENTITY))).toBe(false)
  })

  it('swaps width and height on odd turns only', () => {
    expect(orientedDim(SRC, rotateRight(IDENTITY))).toEqual({ width: 300, height: 400 })
    expect(orientedDim(SRC, { turns: 2, flipH: true, flipV: false })).toEqual(SRC)
  })

  it('describes itself', () => {
    expect(describeOrientation(IDENTITY)).toBe('original orientation')
    expect(describeOrientation({ turns: 1, flipH: false, flipV: true })).toBe(
      'rotated 90° clockwise, flipped left-right',
    )
    expect(describeOrientation({ turns: 1, flipH: true, flipV: false })).toBe(
      'rotated 90° clockwise, flipped top-bottom',
    )
  })
})

describe('flips follow the screen', () => {
  it('flip left-right after a turn mirrors the turned picture', () => {
    const turned = rotateRight(IDENTITY)
    const flipped = flipHorizontal(turned)
    expect(flipped).toEqual({ turns: 1, flipH: false, flipV: true })
    // Source top-left is the turned picture's top-right; mirrored it is the top-left.
    expect(orientPoint({ x: 0, y: 0 }, SRC, turned)).toEqual({ x: 300, y: 0 })
    expect(orientPoint({ x: 0, y: 0 }, SRC, flipped)).toEqual({ x: 0, y: 0 })
    // And top-bottom mirrors the turned picture vertically.
    const upside = flipVertical(turned)
    expect(orientPoint({ x: 0, y: 0 }, SRC, upside)).toEqual({ x: 300, y: 400 })
  })
})

describe('orientation geometry', () => {
  it('turns the top-left corner to the top-right on a clockwise quarter turn', () => {
    const right = rotateRight(IDENTITY)
    expect(orientPoint({ x: 0, y: 0 }, SRC, right)).toEqual({ x: 300, y: 0 })
    expect(orientPoint({ x: 400, y: 300 }, SRC, right)).toEqual({ x: 0, y: 400 })
    expect(orientPoint({ x: 0, y: 0 }, SRC, flipHorizontal(IDENTITY))).toEqual({ x: 400, y: 0 })
  })

  it('the canvas matrix agrees with the point mapping for every orientation', () => {
    for (const o of all) {
      const o2 = orientedDim(SRC, o)
      // Draw the 400×300 picture into the canvas laid out before turning: the pre-turn size.
      const m = orientMatrix(o, SRC.width, SRC.height)
      for (const p of [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
        { x: 400, y: 300 },
        { x: 120, y: 80 },
      ]) {
        const viaMatrix = apply(m, p.x, p.y)
        const viaPoint = orientPoint(p, SRC, o)
        expect(viaMatrix.x).toBeCloseTo(viaPoint.x, 6)
        expect(viaMatrix.y).toBeCloseTo(viaPoint.y, 6)
        expect(viaPoint.x).toBeGreaterThanOrEqual(0)
        expect(viaPoint.x).toBeLessThanOrEqual(o2.width)
      }
    }
  })

  it('unorienting undoes orienting for every orientation', () => {
    for (const o of all) {
      for (const p of [
        { x: 10, y: 20 },
        { x: 400, y: 300 },
        { x: 123, y: 45 },
      ]) {
        const back = unorientPoint(orientPoint(p, SRC, o), SRC, o)
        expect(back.x).toBeCloseTo(p.x, 6)
        expect(back.y).toBeCloseTo(p.y, 6)
      }
    }
  })

  it('maps crop rectangles both ways', () => {
    const r = { x: 50, y: 40, w: 100, h: 60 }
    for (const o of all) {
      const there = rectToOriented(r, SRC, o)
      expect(there.w * there.h).toBe(r.w * r.h)
      expect(rectFromOriented(there, SRC, o)).toEqual(r)
    }
    expect(rectToOriented(r, SRC, rotateRight(IDENTITY))).toEqual({ x: 200, y: 50, w: 60, h: 100 })
  })
})
