import { describe, expect, it } from 'vitest'
import {
  describeDoc,
  FORM_PRESETS,
  findDoc,
  limitsBytes,
} from '../../../src/core/image/formPresets'
import { padJpeg } from '../../../src/core/image/jpegPad'

/** SOI, a JFIF APP0 segment, some "image" bytes, EOI. */
const jpeg = (extra = 20) =>
  new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    1,
    1,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    ...Array.from({ length: extra }, (_, i) => i % 251),
    0xff,
    0xd9,
  ])

describe('padJpeg', () => {
  it('reaches the minimum without disturbing the image', () => {
    const src = jpeg()
    const out = padJpeg(src, 5000)
    expect(out.length).toBeGreaterThanOrEqual(5000)
    expect(out.length).toBeLessThanOrEqual(5003)
    // Start marker and JFIF header first, then a comment, then the original rest, then the end.
    expect([...out.subarray(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xe0])
    expect([...out.subarray(20, 22)]).toEqual([0xff, 0xfe])
    expect([...out.subarray(out.length - src.length + 20)]).toEqual([...src.subarray(20)])
  })

  it('splits big padding into valid comment segments', () => {
    const out = padJpeg(jpeg(), 200_000)
    expect(out.length).toBeGreaterThanOrEqual(200_000)
    let at = 20
    let segments = 0
    while (out[at] === 0xff && out[at + 1] === 0xfe) {
      at += 2 + ((out[at + 2] << 8) | out[at + 3])
      segments++
    }
    expect(segments).toBeGreaterThan(2)
    expect(out[at]).toBe(jpeg()[20])
  })

  it('leaves long enough files and non-JPEG data alone', () => {
    const src = jpeg(100)
    expect(padJpeg(src, 50)).toBe(src)
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
    expect(padJpeg(png, 1000)).toBe(png)
  })
})

describe('form presets', () => {
  it('has sane sizes for every document', () => {
    for (const form of FORM_PRESETS) {
      expect(form.docs.length).toBeGreaterThan(0)
      for (const d of form.docs) {
        expect(d.width).toBeGreaterThan(0)
        expect(d.height).toBeGreaterThan(0)
        expect(d.minKb).toBeLessThan(d.maxKb)
      }
    }
  })

  it('finds a document and describes it plainly', () => {
    const d = findDoc('ibps', 'signature')
    expect(d && describeDoc(d)).toBe('140 × 60 px, JPG, 10–20 KB')
    expect(findDoc('ibps', 'nope')).toBeUndefined()
  })

  it('uses the window that is right whether a KB is 1000 or 1024 bytes', () => {
    const d = findDoc('ibps', 'photo')
    expect(d && limitsBytes(d)).toEqual({ min: 20 * 1024, max: 50 * 1000 })
  })
})
