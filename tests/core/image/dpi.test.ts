import { describe, expect, it } from 'vitest'
import { readDpi, setJpegDpi, setPngDpi } from '../../../src/core/image/dpi'
import { crc32 } from '../../../src/core/image/zip'

describe('dpi metadata', () => {
  const jfif = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9,
  ])
  const bare = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0, 2, 0xff, 0xd9])

  it('sets JPEG density in place or adds a header', () => {
    const set = setJpegDpi(jfif, 300)
    expect(readDpi(set)).toBe(300)
    expect(set.length).toBe(jfif.length)
    const added = setJpegDpi(bare, 150)
    expect(readDpi(added)).toBe(150)
    expect(added.length).toBe(bare.length + 18)
    expect(Array.from(added.subarray(0, 4))).toEqual([0xff, 0xd8, 0xff, 0xe0])
    expect(Array.from(added.subarray(-6))).toEqual(Array.from(bare.subarray(-6)))
  })

  function png(extra: number[][] = []): Uint8Array {
    const chunk = (type: string, data: number[]) => {
      const body = new Uint8Array([...new TextEncoder().encode(type), ...data])
      const out = new Uint8Array(12 + data.length)
      const v = new DataView(out.buffer)
      v.setUint32(0, data.length)
      out.set(body, 4)
      v.setUint32(8 + data.length, crc32(body))
      return out
    }
    const parts = [
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
      ...extra.map((d) => chunk('pHYs', d)),
      chunk('IEND', []),
    ]
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
    let at = 0
    for (const p of parts) {
      out.set(p, at)
      at += p.length
    }
    return out
  }

  it('adds or replaces the PNG pHYs chunk with a valid CRC', () => {
    const plain = png()
    const withDpi = setPngDpi(plain, 300)
    expect(readDpi(withDpi)).toBe(300)
    expect(withDpi.length).toBe(plain.length + 21)
    const view = new DataView(withDpi.buffer)
    const at = 33 // signature (8) + IHDR chunk (25)
    expect(String.fromCharCode(...withDpi.subarray(at + 4, at + 8))).toBe('pHYs')
    expect(view.getUint32(at + 17)).toBe(crc32(withDpi.subarray(at + 4, at + 17)))
    expect(String.fromCharCode(...withDpi.subarray(-8, -4))).toBe('IEND')

    const replaced = setPngDpi(png([[0, 0, 0x0e, 0xc4, 0, 0, 0x0e, 0xc4, 1]]), 72)
    expect(readDpi(replaced)).toBe(72)
    expect(replaced.length).toBe(plain.length + 21)
  })

  it('leaves other data untouched', () => {
    const notImage = new Uint8Array([1, 2, 3])
    expect(setPngDpi(notImage, 300)).toBe(notImage)
    expect(setJpegDpi(notImage, 300)).toBe(notImage)
  })
})
