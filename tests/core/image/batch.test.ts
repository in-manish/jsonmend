import { describe, expect, it } from 'vitest'
import { batchDims, savedPercent, uniqueNames } from '../../../src/core/image/batch'

describe('batchDims', () => {
  const photo = { width: 4000, height: 3000 }
  it('keeps the size, or scales by a percentage', () => {
    expect(batchDims(photo, 'original', 0)).toEqual(photo)
    expect(batchDims(photo, 'percent', 50)).toEqual({ width: 2000, height: 1500 })
  })
  it('fits the longer side, for landscape and portrait', () => {
    expect(batchDims(photo, 'longest', 1000)).toEqual({ width: 1000, height: 750 })
    expect(batchDims({ width: 3000, height: 4000 }, 'longest', 1000)).toEqual({
      width: 750,
      height: 1000,
    })
  })
  it('never enlarges a small photo', () => {
    expect(batchDims({ width: 640, height: 480 }, 'longest', 1920)).toEqual({
      width: 640,
      height: 480,
    })
  })
})

describe('uniqueNames', () => {
  it('numbers repeats before the extension', () => {
    expect(uniqueNames(['a.jpg', 'b.jpg', 'a.jpg', 'A.JPG', 'a.jpg'])).toEqual([
      'a.jpg',
      'b.jpg',
      'a (2).jpg',
      'A (3).JPG',
      'a (4).jpg',
    ])
  })
  it('does not reuse a name that is already taken by a numbered one', () => {
    expect(uniqueNames(['a (2).jpg', 'a.jpg', 'a.jpg'])).toEqual([
      'a (2).jpg',
      'a.jpg',
      'a (3).jpg',
    ])
  })
  it('handles names without an extension', () => {
    expect(uniqueNames(['photo', 'photo'])).toEqual(['photo', 'photo (2)'])
  })
})

describe('savedPercent', () => {
  it('compares sizes', () => {
    expect(savedPercent(1000, 250)).toBe(75)
    expect(savedPercent(1000, 1200)).toBe(0)
    expect(savedPercent(0, 10)).toBeUndefined()
  })
})
