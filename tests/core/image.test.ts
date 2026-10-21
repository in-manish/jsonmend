import { describe, expect, it } from 'vitest'
import { fromPercent, linkedHeight, linkedWidth } from '../../src/core/image/dims'
import { Cancelled, fitToTarget } from '../../src/core/image/fitToTarget'
import { parsePageRange } from '../../src/core/image/pageRange'
import { buildPdf, pageGeometry } from '../../src/core/image/pdfWriter'
import { formatBytes, parseSize, toBytes } from '../../src/core/image/size'
import { crc32, createZip } from '../../src/core/image/zip'

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
const encoder = (full: number) => ({
  calls: 0,
  async encode(q: number, s: number) {
    this.calls++
    return { size: Math.round(full * (0.05 + 0.95 * q ** 2) * s * s) }
  },
})

describe('fitToTarget', () => {
  it('keeps the highest quality that fits', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 300_000,
      lossy: true,
      allowScale: false,
      encode: (q, s) => e.encode(q, s),
    })
    expect(r.met).toBe(true)
    expect(r.result.size).toBeLessThanOrEqual(300_000)
    expect(r.result.size).toBeGreaterThan(250_000)
    expect(r.scale).toBe(1)
  })

  it('returns max quality without searching when the target is generous', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 5_000_000,
      lossy: true,
      allowScale: false,
      encode: (q, s) => e.encode(q, s),
    })
    expect(r.quality).toBe(0.92)
    expect(e.calls).toBe(1)
  })

  it('reports a miss when quality alone cannot reach the target and scaling is off', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 10_000,
      lossy: true,
      allowScale: false,
      encode: (q, s) => e.encode(q, s),
    })
    expect(r.met).toBe(false)
    expect(r.result.size).toBeGreaterThan(10_000)
  })

  it('scales down when quality is not enough, then raises quality again', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 10_000,
      lossy: true,
      allowScale: true,
      encode: (q, s) => e.encode(q, s),
    })
    expect(r.met).toBe(true)
    expect(r.scale).toBeLessThan(1)
    expect(r.result.size).toBeLessThanOrEqual(10_000)
    expect(r.quality).toBeGreaterThan(0.7)
  })

  it('handles lossless formats by scaling only', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 400_000,
      lossy: false,
      allowScale: true,
      encode: (_q, s) => e.encode(1, s),
    })
    expect(r.met).toBe(true)
    expect(r.scale).toBeLessThan(1)
    const none = await fitToTarget({
      target: 400_000,
      lossy: false,
      allowScale: false,
      encode: (_q, s) => e.encode(1, s),
    })
    expect(none.met).toBe(false)
  })

  it('can be cancelled', async () => {
    const signal = { cancelled: false }
    const e = encoder(1_000_000)
    await expect(
      fitToTarget({
        target: 1,
        lossy: true,
        allowScale: true,
        signal,
        encode: async (q, s) => {
          signal.cancelled = true
          return e.encode(q, s)
        },
      }),
    ).rejects.toBeInstanceOf(Cancelled)
  })
})

describe('pdfWriter', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])
  const img = { jpeg, width: 400, height: 200 }

  it('lays an image out on the page', () => {
    const fit = pageGeometry(img, { size: 'fit', margin: 0, orientation: 'auto' })
    expect([fit.pw, fit.ph]).toEqual([300, 150])
    const a4 = pageGeometry(img, { size: 'a4', margin: 36, orientation: 'auto' })
    expect(a4.pw).toBeGreaterThan(a4.ph)
    expect(a4.x).toBeGreaterThanOrEqual(36)
    const portrait = pageGeometry(img, { size: 'a4', margin: 0, orientation: 'portrait' })
    expect(portrait.pw).toBeLessThan(portrait.ph)
    expect(portrait.w).toBeCloseTo(595.28)
  })

  it('writes a structurally valid PDF with correct xref offsets', () => {
    const pdf = buildPdf([img, img], { size: 'a4', margin: 20, orientation: 'auto' })
    const text = new TextDecoder('latin1').decode(pdf)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(text).toContain('/Count 2')
    expect(text).toContain('/Filter /DCTDecode')
    const xref = Number(/startxref\n(\d+)/.exec(text)?.[1])
    expect(text.slice(xref, xref + 4)).toBe('xref')
    const entries = [...text.slice(xref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]))
    expect(entries.length).toBe(8)
    for (const [i, offset] of entries.entries()) {
      expect(text.slice(offset, offset + 7)).toMatch(new RegExp(`^${i + 1} 0 obj`))
    }
  })
})

describe('zip', () => {
  it('has the right CRC and a readable central directory', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    const zip = createZip([
      { name: 'a.txt', data: new TextEncoder().encode('hello') },
      { name: 'b.txt', data: new TextEncoder().encode('world!') },
    ])
    const view = new DataView(zip.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    const end = zip.length - 22
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)
    expect(view.getUint32(view.getUint32(end + 16, true), true)).toBe(0x02014b50)
  })
})

describe('parsePageRange', () => {
  it('parses lists and ranges', () => {
    expect(parsePageRange('', 4).pages).toEqual([1, 2, 3, 4])
    expect(parsePageRange('all', 2).pages).toEqual([1, 2])
    expect(parsePageRange('1-2, 4', 5).pages).toEqual([1, 2, 4])
    expect(parsePageRange('3,1,3', 5).pages).toEqual([1, 3])
  })
  it('explains bad input', () => {
    expect(parsePageRange('0', 3).error).toContain('outside')
    expect(parsePageRange('2-9', 3).error).toContain('outside')
    expect(parsePageRange('x', 3).error).toContain('not a page')
  })
})
