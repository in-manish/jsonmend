import type { Span } from './ast'

/**
 * `info`: harmless change. `warn`: content changed, likely what the user wanted.
 * `guess`: reconstruction the user should verify. `error`: could not produce output.
 */
export type Severity = 'info' | 'warn' | 'guess' | 'error'

export type Category = 'input' | 'normalize' | 'structure' | 'type' | 'output'

export interface Diagnostic {
  severity: Severity
  category: Category
  /** Stable machine-readable id, e.g. `structure.duplicate-key`. */
  code: string
  message: string
  /** Location in the input text. */
  span?: Span
  /** Location in the output text, filled in by the serializer. */
  outputSpan?: Span
  /** For type conversions: the source snippet and the JSON it became. */
  original?: string
  converted?: string
}

export interface Position {
  offset: number
  /** 1-based */
  line: number
  /** 1-based, in UTF-16 code units */
  column: number
}

export function positionAt(text: string, offset: number): Position {
  let line = 1
  let lineStart = 0
  for (let i = text.indexOf('\n'); i !== -1 && i < offset; i = text.indexOf('\n', i + 1)) {
    line++
    lineStart = i + 1
  }
  return { offset, line, column: offset - lineStart + 1 }
}

/** Per-code cap so a 5 MB file full of unquoted keys doesn't produce 100k report rows. */
const MAX_PER_CODE = 200

/** Collects diagnostics for one pipeline run. */
export class Reporter {
  readonly list: Diagnostic[] = []
  private readonly perCode = new Map<string, number>()
  private readonly suppressed = new Map<string, Diagnostic & { count: number }>()

  /** Returns the diagnostic's index, or -1 when it was folded into a summary. */
  add(d: Diagnostic): number {
    const seen = this.perCode.get(d.code) ?? 0
    this.perCode.set(d.code, seen + 1)
    if (seen >= MAX_PER_CODE) {
      const s = this.suppressed.get(d.code)
      if (s) s.count++
      else this.suppressed.set(d.code, { ...d, count: 1 })
      return -1
    }
    this.list.push(d)
    return this.list.length - 1
  }

  /** Appends one summary per code that hit the cap. Call once, at the end of a run. */
  finish(): Diagnostic[] {
    for (const { count, ...d } of this.suppressed.values()) {
      this.list.push({
        severity: d.severity,
        category: d.category,
        code: d.code,
        message: `...and ${count} more like this (${d.code})`,
      })
    }
    this.suppressed.clear()
    return this.list
  }
}

export function countBySeverity(diagnostics: Diagnostic[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { info: 0, warn: 0, guess: 0, error: 0 }
  for (const d of diagnostics) counts[d.severity]++
  return counts
}

export function countByCategory(diagnostics: Diagnostic[]): Record<Category, number> {
  const counts: Record<Category, number> = {
    input: 0,
    normalize: 0,
    structure: 0,
    type: 0,
    output: 0,
  }
  for (const d of diagnostics) counts[d.category]++
  return counts
}

/** "3 type conversions, 2 structural repairs, 1 guess" */
export function summarize(diagnostics: Diagnostic[]): string {
  const cat = countByCategory(diagnostics)
  const sev = countBySeverity(diagnostics)
  const parts: string[] = []
  const add = (n: number, one: string, many: string) => {
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`)
  }
  add(cat.type, 'type conversion', 'type conversions')
  add(cat.structure, 'structural repair', 'structural repairs')
  add(cat.normalize, 'text cleanup', 'text cleanups')
  add(sev.guess, 'guess', 'guesses')
  return parts.length > 0 ? parts.join(', ') : 'No changes needed'
}
