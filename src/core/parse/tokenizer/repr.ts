import type { ScanSource } from './source'

/** `<...>` object reprs, with nested `<>` and quotes. Returns the end offset. */
export function scanRepr(s: ScanSource, start: number): number {
  const { text, end } = s
  let depth = 0
  let i = start
  while (i < end) {
    const ch = text[i]
    if (ch === '<') depth++
    else if (ch === '>') {
      depth--
      if (depth === 0) return i + 1
    } else if (ch === '\n') break
    else if (ch === "'" || ch === '"') {
      const close = text.indexOf(ch, i + 1)
      const eol = text.indexOf('\n', i + 1)
      if (close !== -1 && (eol === -1 || close < eol)) i = close
    }
    i++
  }
  s.reporter.add({
    severity: 'warn',
    category: 'structure',
    code: 'structure.unclosed-repr',
    message: 'Object repr starting with < has no closing >; took the rest of the line',
    span: { start, end: i },
  })
  return i
}
