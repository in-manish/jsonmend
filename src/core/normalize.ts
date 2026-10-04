import type { Diagnostic, Severity } from './report'

interface Rule {
  code: string
  re: RegExp
  to: string
  describe: (count: number) => string
  severity: Severity
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const RULES: Rule[] = [
  {
    code: 'normalize.line-endings',
    re: /\r\n?/g,
    to: '\n',
    describe: (n) => `Converted ${plural(n, 'CR/CRLF line ending')} to LF`,
    severity: 'info',
  },
  {
    code: 'normalize.zero-width',
    re: /\u200b|\u200c|\u200d|\u2060|\ufeff/g,
    to: '',
    describe: (n) => `Removed ${plural(n, 'zero-width character')}`,
    severity: 'info',
  },
  {
    code: 'normalize.nbsp',
    re: /[\u00a0\u2007\u202f]/g,
    to: ' ',
    describe: (n) => `Replaced ${plural(n, 'non-breaking space')} with spaces`,
    severity: 'info',
  },
  {
    code: 'normalize.smart-double-quotes',
    re: /[\u201c\u201d\u201e\u201f\u2033]/g,
    to: '"',
    describe: (n) => `Replaced ${plural(n, 'curly double quote')} with "`,
    severity: 'warn',
  },
  {
    code: 'normalize.smart-single-quotes',
    re: /[\u2018\u2019\u201a\u201b\u2032]/g,
    to: "'",
    describe: (n) => `Replaced ${plural(n, 'curly single quote')} with '`,
    severity: 'warn',
  },
]

/**
 * Undo common copy-paste damage (word processors, chat apps, web pages).
 *
 * This rewrites characters everywhere, including inside string values, so the pipeline only
 * applies it after the raw text has failed to parse.
 */
export function normalize(text: string): { value: string; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []
  let value = text
  for (const rule of RULES) {
    let count = 0
    value = value.replace(rule.re, () => {
      count++
      return rule.to
    })
    if (count > 0) {
      diagnostics.push({
        severity: rule.severity,
        category: 'normalize',
        code: rule.code,
        message: rule.describe(count),
      })
    }
  }
  return { value, diagnostics }
}
