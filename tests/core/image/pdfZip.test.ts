import { describe, expect, it } from 'vitest'
import { parsePageRange } from '../../../src/core/image/pageRange'
import { buildPdf, pageGeometry } from '../../../src/core/image/pdfWriter'
import { crc32, createZip } from '../../../src/core/image/zip'

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
