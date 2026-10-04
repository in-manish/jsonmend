import { describe, expect, it } from 'vitest'
import { format, Reporter, summarize } from '../../src/core'

describe('report', () => {
  it('lists added closers innermost first', () => {
    const r = format('{"users": [{"id": 1, "name": "A"}, {"id": 2, "name": "B"')
    expect(r.diagnostics.find((d) => d.code === 'structure.missing-closers')?.message).toBe(
      'Added 3 closing brackets: } ] }',
    )
  })

  it('maps repairs to output spans for highlighting', () => {
    const r = format('{"a": [1, 2', { indent: 'none' })
    expect(r.output).toBe('{"a":[1,2]}')
    const d = r.diagnostics.find((x) => x.code === 'structure.missing-closers')
    expect(d?.outputSpan).toBeDefined()
    expect(r.output.slice(d?.outputSpan?.start, d?.outputSpan?.end)).toBe(']}')
  })

  it('maps type conversions to their input and output text', () => {
    const input = "{'t': datetime.date(2024, 1, 5)}"
    const r = format(input, { indent: 'none' })
    const d = r.diagnostics.find((x) => x.code === 'type.date')
    expect(d?.original).toBe('datetime.date(2024, 1, 5)')
    expect(d?.converted).toBe('"2024-01-05"')
    expect(input.slice(d?.span?.start, d?.span?.end)).toBe('datetime.date(2024, 1, 5)')
    expect(r.output.slice(d?.outputSpan?.start, d?.outputSpan?.end)).toBe('"2024-01-05"')
  })

  it('flags guessed repairs as low confidence', () => {
    expect(format('{"msg": "say "hi" now"}').confidence).toBe('low')
    expect(format("{'a': 1}").confidence).toBe('high')
  })

  it('caps repeated diagnostics and summarises the rest', () => {
    const input = `{${Array.from({ length: 500 }, (_, i) => `k${i}: ${i}`).join(', ')}}`
    const r = format(input)
    const unquoted = r.diagnostics.filter((d) => d.code === 'structure.unquoted-key')
    expect(unquoted).toHaveLength(201)
    expect(unquoted.at(-1)?.message).toBe('...and 300 more like this (structure.unquoted-key)')
  })

  it('summarises counts in plain language', () => {
    const r = format("{'a': datetime.date(2024, 1, 5), 'b': {1, 2}, 'c': \"x \"y\" z\"")
    expect(summarize(r.diagnostics)).toBe('2 type conversions, 2 structural repairs, 1 guess')
  })

  it('reporter returns -1 for folded diagnostics', () => {
    const rep = new Reporter()
    for (let i = 0; i < 200; i++)
      rep.add({ severity: 'info', category: 'input', code: 'x', message: '' })
    expect(rep.add({ severity: 'info', category: 'input', code: 'x', message: '' })).toBe(-1)
  })

  it('exposes every payload candidate in noisy text', () => {
    const r = format('INFO {"a":1}\nINFO {"b":2, "c":3}')
    expect(r.payloads.list).toHaveLength(2)
    expect(r.payloads.index).toBe(1)
  })
})
