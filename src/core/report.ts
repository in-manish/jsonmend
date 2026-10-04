export type Severity = 'info' | 'warn' | 'guess'

export interface Diagnostic {
  severity: Severity
  message: string
  /** Offset into the input text, when known. */
  offset?: number
}
