import { describe, expect, it } from 'vitest'
import { normalize } from '../../src/core'

const ch = (...codes: number[]) => String.fromCharCode(...codes)

describe('normalize', () => {
  it('leaves clean text alone', () => {
    expect(normalize('{"a": 1}\n')).toEqual({ value: '{"a": 1}\n', diagnostics: [] })
  })

  it('reports each kind of change with a count', () => {
    const input = `a\r\nb\rc${ch(0x200b, 0x2060)}${ch(0xa0)}${ch(0x201c, 0x201d)}${ch(0x2019)}`
    const { value, diagnostics } = normalize(input)
    expect(value).toBe(`a\nb\nc ""'`)
    expect(diagnostics.map((d) => d.message)).toEqual([
      'Converted 2 CR/CRLF line endings to LF',
      'Removed 2 zero-width characters',
      'Replaced 1 non-breaking space with spaces',
      'Replaced 2 curly double quotes with "',
      "Replaced 1 curly single quote with '",
    ])
  })
})
