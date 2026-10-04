import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type FormatOptions, format } from '../../src/core'

const optionsArb: fc.Arbitrary<Partial<FormatOptions>> = fc.record(
  {
    indent: fc.constantFrom<FormatOptions['indent']>(2, 4, 'tab', 'none'),
    sortKeys: fc.constantFrom('none', 'asc', 'desc'),
    sortDeep: fc.boolean(),
    ensureAscii: fc.boolean(),
    htmlSafe: fc.boolean(),
  },
  { requiredKeys: [] },
)

const jsonText = fc.jsonValue().map((v) => JSON.stringify(v))

describe('properties', () => {
  it('output parses to the same value as the input, for any options', () => {
    fc.assert(
      fc.property(jsonText, optionsArb, (text, options) => {
        const r = format(text, options)
        expect(r.ok).toBe(true)
        expect(JSON.parse(r.output)).toEqual(JSON.parse(text))
      }),
    )
  })

  it('is idempotent', () => {
    fc.assert(
      fc.property(jsonText, optionsArb, (text, options) => {
        const once = format(text, options).output
        expect(format(once, options).output).toBe(once)
      }),
    )
  })

  it('matches JSON.stringify(v, null, 2) for default options', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (v) => {
        const text = JSON.stringify(v)
        expect(format(text).output).toBe(JSON.stringify(JSON.parse(text), null, 2))
      }),
    )
  })

  it('never throws on arbitrary text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (text) => {
        const r = format(text)
        if (r.ok) expect(() => JSON.parse(r.output)).not.toThrow()
        else expect(r.output).toBe('')
      }),
    )
  })
})
