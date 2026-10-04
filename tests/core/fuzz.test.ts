import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { format } from '../../src/core'

/** Random edits that mimic copy-paste damage and truncation. */
const damaged = fc
  .tuple(
    fc.jsonValue().map((v) => JSON.stringify(v, null, 1) ?? 'null'),
    fc.array(
      fc.record({
        at: fc.nat(),
        op: fc.constantFrom('delete', 'insert', 'truncate'),
        ch: fc.constantFrom('{', '}', '[', ']', '"', "'", ',', ':', ' ', '\n', '\\', '#', '<'),
      }),
      { maxLength: 6 },
    ),
  )
  .map(([text, edits]) => {
    let s = text
    for (const { at, op, ch } of edits) {
      const i = s.length === 0 ? 0 : at % (s.length + 1)
      if (op === 'delete') s = s.slice(0, i) + s.slice(i + 1)
      else if (op === 'insert') s = s.slice(0, i) + ch + s.slice(i)
      else s = s.slice(0, Math.max(1, i))
    }
    return s
  })

describe('fuzz', () => {
  it('never throws or hangs on damaged JSON, and every success is valid JSON', () => {
    fc.assert(
      fc.property(damaged, (text) => {
        const r = format(text)
        if (r.ok) expect(() => JSON.parse(r.output)).not.toThrow()
        else expect(r.output).toBe('')
        expect(r.stats.durationMs).toBeLessThan(1000)
      }),
      { numRuns: 1000 },
    )
  })

  it('never throws on arbitrary unicode text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 200 }), (text) => {
        const r = format(text)
        if (r.ok) expect(() => JSON.parse(r.output)).not.toThrow()
      }),
      { numRuns: 500 },
    )
  })

  it('handles pathological nesting without overflowing the stack', () => {
    for (const text of [
      '['.repeat(50_000),
      '{"a":'.repeat(20_000),
      '('.repeat(30_000),
      `${'{'.repeat(9_000)}`,
    ]) {
      const r = format(text)
      if (r.ok) expect(() => JSON.parse(r.output)).not.toThrow()
      else expect(r.error?.message).toMatch(/nest|deep/i)
    }
  })
})
