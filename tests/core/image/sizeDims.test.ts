import { describe, expect, it } from 'vitest'
import {
  fromPercent,
  inchesToPx,
  linkedHeight,
  linkedWidth,
  physicalToPx,
  pxToInches,
  pxToPhysical,
} from '../../../src/core/image/dims'
import { formatBytes, parseSize, toBytes } from '../../../src/core/image/size'

describe('size', () => {
  it('converts units with KB as the default', () => {
    expect(toBytes(200, 'kb')).toBe(204800)
    expect(toBytes(1.5, 'mb')).toBe(1572864)
    expect(parseSize('200')).toBe(204800)
    expect(parseSize('1.5 MB')).toBe(1572864)
    expect(parseSize('300kb')).toBe(307200)
    expect(parseSize('2', 'mb')).toBe(2097152)
    expect(parseSize('abc')).toBeUndefined()
    expect(parseSize('0')).toBeUndefined()
  })
  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2.00 KB')
    expect(formatBytes(1572864)).toBe('1.50 MB')
  })
})

describe('dims', () => {
  it('keeps the aspect ratio and clamps', () => {
    const d = { width: 4000, height: 3000 }
    expect(linkedHeight(d, 1000)).toBe(750)
    expect(linkedWidth(d, 600)).toBe(800)
    expect(fromPercent(d, 50)).toEqual({ width: 2000, height: 1500 })
    expect(fromPercent(d, 0.001)).toEqual({ width: 1, height: 1 })
  })
})

/** A fake encoder: size grows with quality and with scale squared. */

describe('inches', () => {
  it('converts at a resolution', () => {
    expect(inchesToPx(4, 300)).toBe(1200)
    expect(inchesToPx(0.5, 96)).toBe(48)
    expect(pxToInches(1200, 300)).toBe(4)
    expect(pxToInches(1000, 300)).toBe(3.33)
  })

  it('converts centimetres too', () => {
    expect(physicalToPx(2.54, 'cm', 300)).toBe(300)
    expect(physicalToPx(10, 'cm', 300)).toBe(1181)
    expect(pxToPhysical(1181, 'cm', 300)).toBe(10)
    expect(pxToPhysical(300, 'in', 300)).toBe(1)
    expect(pxToPhysical(300, 'cm', 300)).toBe(2.54)
  })
})
