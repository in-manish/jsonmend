import { type Dim, fromPercent, linkedHeight, linkedWidth, scaleDim } from './dims'

/** How every photo in a batch is resized. */
export type BatchSizeMode = 'original' | 'percent' | 'longest'

/**
 * Size of one photo after the batch resize. `longest` fits the longer side to `value` pixels and
 * never enlarges; `percent` scales both sides.
 */
export function batchDims(src: Dim, mode: BatchSizeMode, value: number): Dim {
  if (mode === 'percent') return fromPercent(src, value)
  if (mode === 'longest' && Math.max(src.width, src.height) > value) {
    return src.width >= src.height
      ? { width: value, height: linkedHeight(src, value) }
      : { width: linkedWidth(src, value), height: value }
  }
  return scaleDim(src, 1)
}

/**
 * File names for a ZIP: the second "a.jpg" becomes "a (2).jpg", so nothing overwrites anything.
 * Names compare case-insensitively because most systems do.
 */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((name) => {
    const dot = name.lastIndexOf('.')
    const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
    let candidate = name
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${ext}`
    used.add(candidate.toLowerCase())
    return candidate
  })
}

/** "62% smaller" or "no smaller", from byte counts; undefined when nothing to compare. */
export function savedPercent(before: number, after: number): number | undefined {
  if (before <= 0) return undefined
  return Math.max(0, Math.round(((before - after) / before) * 100))
}
