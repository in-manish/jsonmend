import type { Reporter } from '../../report'

/** What the scanner functions need from the lexer. */
export interface ScanSource {
  readonly text: string
  readonly end: number
  readonly reporter: Reporter
  readonly stats: { curlyQuotes: number; rawNewlines: number }
}
