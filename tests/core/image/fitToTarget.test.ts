import { describe, expect, it } from 'vitest'
import { Cancelled, fitToTarget } from '../../../src/core/image/fitToTarget'

const encoder = (full: number) => ({
  calls: 0,
  async encode(q: number, s: number) {
    this.calls++
    return { size: Math.round(full * (0.05 + 0.95 * q ** 2) * s * s) }
  },
})

describe('fitToTarget', () => {
  it('keeps the highest quality that fits', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 300_000,
      lossy: true,
      allowScale: false,
      encode: (q, s) => e.encode(q, s),
    })
    expect(r.met).toBe(true)
    expect(r.result.size).toBeLessThanOrEqual(300_000)
    expect(r.result.size).toBeGreaterThan(250_000)
    expect(r.scale).toBe(1)
  })

  it('returns max quality without searching when the target is generous', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 5_000_000,
      lossy: true,
      allowScale: false,
      encode: (q, s) => e.encode(q, s),
    })
    expect(r.quality).toBe(0.92)
    expect(e.calls).toBe(1)
  })

  it('reports a miss when quality alone cannot reach the target and scaling is off', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 10_000,
      lossy: true,
      allowScale: false,
      encode: (q, s) => e.encode(q, s),
    })
    expect(r.met).toBe(false)
    expect(r.result.size).toBeGreaterThan(10_000)
  })

  it('scales down when quality is not enough, then raises quality again', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 10_000,
      lossy: true,
      allowScale: true,
      encode: (q, s) => e.encode(q, s),
    })
    expect(r.met).toBe(true)
    expect(r.scale).toBeLessThan(1)
    expect(r.result.size).toBeLessThanOrEqual(10_000)
    expect(r.quality).toBeGreaterThan(0.7)
  })

  it('handles lossless formats by scaling only', async () => {
    const e = encoder(1_000_000)
    const r = await fitToTarget({
      target: 400_000,
      lossy: false,
      allowScale: true,
      encode: (_q, s) => e.encode(1, s),
    })
    expect(r.met).toBe(true)
    expect(r.scale).toBeLessThan(1)
    const none = await fitToTarget({
      target: 400_000,
      lossy: false,
      allowScale: false,
      encode: (_q, s) => e.encode(1, s),
    })
    expect(none.met).toBe(false)
  })

  it('can be cancelled', async () => {
    const signal = { cancelled: false }
    const e = encoder(1_000_000)
    await expect(
      fitToTarget({
        target: 1,
        lossy: true,
        allowScale: true,
        signal,
        encode: async (q, s) => {
          signal.cancelled = true
          return e.encode(q, s)
        },
      }),
    ).rejects.toBeInstanceOf(Cancelled)
  })
})
