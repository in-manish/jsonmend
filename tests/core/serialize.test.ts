import { describe, expect, it } from 'vitest'
import { quote } from '../../src/core'

const BS = '\\'
const ch = (...codes: number[]) => String.fromCharCode(...codes)

describe('quote', () => {
  it('matches JSON.stringify for ordinary strings', () => {
    for (const s of [
      '',
      'abc',
      'a"b',
      `a${BS}b`,
      'line\nbreak',
      `x${ch(0, 0x1f, 0x7f)}y`,
      'Zoë 🎉',
    ]) {
      expect(quote(s)).toBe(JSON.stringify(s))
    }
  })

  it('escapes lone surrogates but keeps valid pairs', () => {
    expect(quote(ch(0xd800))).toBe(`"${BS}ud800"`)
    expect(quote(`${ch(0xdc00)}x`)).toBe(`"${BS}udc00x"`)
    expect(quote(ch(0xd83c, 0xdf89))).toBe(`"${ch(0xd83c, 0xdf89)}"`)
  })

  it('ensureAscii escapes everything outside printable ASCII', () => {
    expect(quote(`é${ch(0x7f)}🎉~`, true)).toBe(`"${BS}u00e9${BS}u007f${BS}ud83c${BS}udf89~"`)
  })

  it('htmlSafe escapes / < > &', () => {
    expect(quote('</a>&', false, true)).toBe(`"${BS}u003c${BS}/a${BS}u003e${BS}u0026"`)
  })
})
