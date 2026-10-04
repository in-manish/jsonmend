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
  span?: Span
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
