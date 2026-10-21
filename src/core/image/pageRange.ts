/** "1-3, 5" -> [1, 2, 3, 5] within `total` pages; empty or "all" means every page. */
export function parsePageRange(text: string, total: number): { pages: number[]; error?: string } {
  const all = Array.from({ length: total }, (_, i) => i + 1)
  const t = text.trim().toLowerCase()
  if (t === '' || t === 'all') return { pages: all }
  const pages = new Set<number>()
  for (const part of t.split(',')) {
    const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(part)
    if (!m) return { pages: [], error: `"${part.trim()}" is not a page or range` }
    const from = Number(m[1])
    const to = m[2] ? Number(m[2]) : from
    if (from < 1 || to < from || to > total) {
      return { pages: [], error: `${part.trim()} is outside pages 1-${total}` }
    }
    for (let p = from; p <= to; p++) pages.add(p)
  }
  return { pages: [...pages].sort((a, b) => a - b) }
}
