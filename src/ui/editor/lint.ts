import type { Diagnostic as CmDiagnostic } from '@codemirror/lint'
import type { Diagnostic } from '../../core'

const SEVERITY: Record<Diagnostic['severity'], CmDiagnostic['severity']> = {
  error: 'error',
  guess: 'warning',
  warn: 'warning',
  info: 'info',
}

/** Pipeline diagnostics with an input span, as CodeMirror lint markers. */
export function toLint(diagnostics: Diagnostic[], docLength: number): CmDiagnostic[] {
  const out: CmDiagnostic[] = []
  for (const d of diagnostics) {
    if (!d.span || d.category === 'input') continue
    const from = Math.min(d.span.start, docLength)
    const to = Math.min(Math.max(d.span.end, from), docLength)
    out.push({ from, to, severity: SEVERITY[d.severity], message: d.message, source: d.code })
  }
  return out
}
