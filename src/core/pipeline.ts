import type { Diagnostic } from './report'

export interface FormatResult {
  ok: boolean
  output: string
  diagnostics: Diagnostic[]
}

/** Phase 0 placeholder: strict JSON only. Later phases add the full pipeline. */
export function format(input: string): FormatResult {
  try {
    const output = JSON.stringify(JSON.parse(input), null, 2)
    return {
      ok: true,
      output,
      diagnostics: [{ severity: 'info', message: 'Input was valid JSON' }],
    }
  } catch (e) {
    return {
      ok: false,
      output: '',
      diagnostics: [{ severity: 'warn', message: (e as Error).message }],
    }
  }
}
