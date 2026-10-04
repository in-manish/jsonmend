import { describe, expect, it } from 'vitest'
import { format } from '../../src/core/pipeline'

describe('format', () => {
  it('pretty-prints valid JSON', () => {
    const r = format('{"a":1,"b":[1,2]}')
    expect(r.ok).toBe(true)
    expect(JSON.parse(r.output)).toEqual({ a: 1, b: [1, 2] })
  })

  it('reports failure on input it cannot handle yet', () => {
    expect(format("{'a': 1}").ok).toBe(false)
  })
})
