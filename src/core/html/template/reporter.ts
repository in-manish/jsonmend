import { type Edit, type HtmlIssue, lineOf, lineStarts } from '../types'

type NewIssue = Omit<HtmlIssue, 'line' | 'from' | 'to' | 'severity'> & {
  severity?: HtmlIssue['severity']
}

/** Collects issues with line numbers and builds the edits suggestions are made of. */
export interface Reporter {
  src: string
  issues: HtmlIssue[]
  lineAt(offset: number): number
  add(from: number, to: number, issue: NewIssue): void
  /** Inserts `text` on its own line before `at` when `at` starts a line, else right before it. */
  insertBefore(at: number, text: string, order?: number): Edit
}

export function createReporter(src: string): Reporter {
  const starts = lineStarts(src)
  const issues: HtmlIssue[] = []
  return {
    src,
    issues,
    lineAt: (offset) => lineOf(starts, offset),
    add: (from, to, issue) =>
      issues.push({ severity: 'error', ...issue, line: lineOf(starts, from), from, to }),
    insertBefore(at, text, order = 0) {
      const ls = starts[lineOf(starts, at) - 1]
      const indent = src.slice(ls, at)
      return indent.trim() === ''
        ? { from: ls, to: ls, insert: `${indent}${text}\n`, order }
        : { from: at, to: at, insert: text, order }
    },
  }
}
