/**
 * Finds encoder settings that produce a file no larger than a target size. Lossy formats first
 * search quality; if even the lowest quality is too big (or the format is lossless) and scaling is
 * allowed, the image is scaled down, then quality is raised again for the final scale.
 * The encoder is injected, so this is pure and testable.
 */
export interface Encoded {
  size: number
}

export interface FitOptions<T extends Encoded> {
  /** Target in bytes. */
  target: number
  /** Whether `quality` changes the size (JPEG, WebP); PNG only responds to scale. */
  lossy: boolean
  /** Encodes at `quality` (0..1) and `scale` (0..1 of the chosen dimensions). */
  encode(quality: number, scale: number): Promise<T>
  maxQuality?: number
  minQuality?: number
  allowScale: boolean
  minScale?: number
  /** Set `cancelled` to stop between encodes. */
  signal?: { cancelled: boolean }
}

export interface FitResult<T extends Encoded> {
  result: T
  quality: number
  scale: number
  /** The result is at or under the target. */
  met: boolean
  /** Number of encodes it took. */
  tries: number
}

export class Cancelled extends Error {}

interface Attempt<T extends Encoded> {
  q: number
  s: number
  r: T
}

export async function fitToTarget<T extends Encoded>(o: FitOptions<T>): Promise<FitResult<T>> {
  const maxQ = o.maxQuality ?? 0.92
  const minQ = o.minQuality ?? 0.05
  const minS = o.minScale ?? 0.1
  let tries = 0
  let smallest: Attempt<T> | undefined

  const enc = async (q: number, s: number): Promise<Attempt<T>> => {
    if (o.signal?.cancelled) throw new Cancelled()
    tries++
    const a = { q, s, r: await o.encode(q, s) }
    if (!smallest || a.r.size < smallest.r.size) smallest = a
    return a
  }
  const done = (a: Attempt<T>, met: boolean): FitResult<T> => ({
    result: a.r,
    quality: a.q,
    scale: a.s,
    met,
    tries,
  })

  /** Highest quality at `scale` that fits, if any does. */
  const bestQuality = async (scale: number): Promise<Attempt<T> | undefined> => {
    if (!o.lossy) {
      const a = await enc(1, scale)
      return a.r.size <= o.target ? a : undefined
    }
    const top = await enc(maxQ, scale)
    if (top.r.size <= o.target) return top
    const bottom = await enc(minQ, scale)
    if (bottom.r.size > o.target) return undefined
    let lo = minQ
    let hi = maxQ
    let best = bottom
    for (let i = 0; i < 7; i++) {
      const mid = (lo + hi) / 2
      const a = await enc(mid, scale)
      if (a.r.size <= o.target) {
        best = a
        lo = mid
      } else hi = mid
    }
    return best
  }

  const direct = await bestQuality(1)
  if (direct) return done(direct, true)
  if (!o.allowScale) return done(smallest as Attempt<T>, false)

  const floorQ = o.lossy ? Math.min(0.7, maxQ) : 1
  const tiny = await enc(floorQ, minS)
  if (tiny.r.size > o.target) return done(smallest as Attempt<T>, false)
  let lo = minS
  let hi = 1
  let best = tiny
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2
    const a = await enc(floorQ, mid)
    if (a.r.size <= o.target) {
      best = a
      lo = mid
    } else hi = mid
  }
  const refined = o.lossy ? await bestQuality(best.s) : undefined
  return done(refined ?? best, true)
}
