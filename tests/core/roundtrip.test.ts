import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { format } from '../../src/core'

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

/** Python's repr() for JSON-like values. */
function pyRepr(v: Json): string {
  if (v === null) return 'None'
  if (v === true) return 'True'
  if (v === false) return 'False'
  if (typeof v === 'number') return JSON.stringify(v)
  if (typeof v === 'string') return pyStr(v)
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`
  return `{${Object.entries(v)
    .map(([k, x]) => `${pyStr(k)}: ${pyRepr(x)}`)
    .join(', ')}}`
}

function pyStr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'"
  let out = q
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    if (ch === '\\') out += '\\\\'
    else if (ch === q) out += `\\${q}`
    else if (ch === '\n') out += '\\n'
    else if (ch === '\t') out += '\\t'
    else if (ch === '\r') out += '\\r'
    else if (c < 0x20 || c === 0x7f) out += `\\x${c.toString(16).padStart(2, '0')}`
    else if (c >= 0xd800 && c <= 0xdfff) out += `\\u${c.toString(16).padStart(4, '0')}`
    else out += ch
  }
  return out + q
}

const IDENT = /^[A-Za-z_$][\w$]*$/
const RESERVED =
  /^(?:true|false|null|True|False|None|NaN|Infinity|nan|inf|undefined|nil|NULL|TRUE|FALSE|NaT)$/

/** A JS object literal: unquoted keys where possible, single quotes, trailing commas, comments. */
function jsLiteral(v: Json): string {
  if (typeof v === 'string') return pyStr(v)
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map((x) => `${jsLiteral(x)},`).join(' ')}]`
  return `{ // object\n${Object.entries(v)
    .map(([k, x]) => `  ${IDENT.test(k) && !RESERVED.test(k) ? k : pyStr(k)}: ${jsLiteral(x)},`)
    .join('\n')}\n}`
}

const jsonValue = fc.jsonValue() as fc.Arbitrary<Json>

describe('round trips', () => {
  it('Python repr of any JSON value converts back to the same value', () => {
    fc.assert(
      fc.property(jsonValue, (v) => {
        const r = format(pyRepr(v))
        expect(r.ok).toBe(true)
        expect(JSON.parse(r.output)).toEqual(JSON.parse(JSON.stringify(v)))
      }),
      { numRuns: 500 },
    )
  })

  it('JS object literal of any JSON value converts back to the same value', () => {
    fc.assert(
      fc.property(jsonValue, (v) => {
        const r = format(jsLiteral(v))
        expect(r.ok).toBe(true)
        expect(JSON.parse(r.output)).toEqual(JSON.parse(JSON.stringify(v)))
      }),
      { numRuns: 500 },
    )
  })

  it('formatting the output again changes nothing', () => {
    fc.assert(
      fc.property(jsonValue, (v) => {
        const once = format(pyRepr(v)).output
        expect(format(once).output).toBe(once)
      }),
      { numRuns: 300 },
    )
  })
})
