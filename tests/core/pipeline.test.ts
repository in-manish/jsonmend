import { describe, expect, it } from 'vitest'
import { countBySeverity, format } from '../../src/core'

describe('format', () => {
  it('pretty-prints valid JSON and reports the strict path', () => {
    const r = format('{"a":1,"b":[1,2]}')
    expect(r.ok).toBe(true)
    expect(r.path).toBe('strict')
    expect(JSON.parse(r.output)).toEqual({ a: 1, b: [1, 2] })
    expect(r.stats.inputChars).toBe(17)
    expect(r.stats.outputChars).toBe(r.output.length)
  })

  it('fails on empty input', () => {
    const r = format('  \n ')
    expect(r).toMatchObject({ ok: false, output: '', error: { message: 'Input is empty' } })
  })

  it('reports the line and column of the first error', () => {
    const r = format('{\n  "a": 1,\n  b: 2\n}')
    expect(r.ok).toBe(false)
    expect(r.output).toBe('')
    expect(r.error?.position).toEqual({ offset: 14, line: 3, column: 3 })
    expect(countBySeverity(r.diagnostics).error).toBe(1)
  })

  it('reports the original error when normalizing does not help', () => {
    const r = format('{\u201ca\u201d: 1,}')
    expect(r.ok).toBe(false)
    expect(r.error?.message).toBe('Expected a double-quoted key but found "\u201c"')
  })

  it('does not rewrite characters inside strings of valid JSON', () => {
    const input = '{"q":"\u201chi\u201d"}'
    expect(format(input, { indent: 'none' }).output).toBe(input)
  })

  it('keeps big integers exact (acceptance criterion)', () => {
    const r = format('[12345678901234567890]', { indent: 'none' })
    expect(r.output).toBe('[12345678901234567890]')
  })

  it('treats a __proto__ key as data, never as a prototype', () => {
    const r = format('{"__proto__":{"x":1}}', { indent: 'none' })
    expect(r.output).toBe('{"__proto__":{"x":1}}')
    expect(({} as Record<string, unknown>).x).toBeUndefined()
  })

  it('fails cleanly beyond maxDepth', () => {
    const r = format('[[[]]]', { maxDepth: 2 })
    expect(r.ok).toBe(false)
    expect(r.error?.message).toMatch(/2-level limit/)
  })

  it('ignores undefined option values', () => {
    expect(format('[1]', { indent: undefined }).output).toBe('[\n  1\n]')
  })
})

describe('format at the depth limit', () => {
  it('parses and serializes 10,000 levels of nesting', () => {
    const deep = `${'['.repeat(10_000)}${']'.repeat(10_000)}`
    const r = format(deep, { indent: 'none' })
    expect(r.ok).toBe(true)
    expect(r.output).toBe(deep)
  })
})
