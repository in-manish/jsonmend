import { describe, expect, it } from 'vitest'
import { format } from '../../src/core'

describe('performance', () => {
  it('formats ~5 MB of valid JSON well within budget', () => {
    const item = '{"id":12345678901234567890,"name":"user","tags":["a","b"],"nested":{"x":1.5}}'
    const text = `[${Array(70_000).fill(item).join(',')}]`
    expect(text.length).toBeGreaterThan(5_000_000)
    const r = format(text)
    expect(r.ok).toBe(true)
    // Plan budget is 1.5 s for the full pipeline in a worker; the fast path should be far below.
    expect(r.stats.durationMs).toBeLessThan(1500)
  })
})
