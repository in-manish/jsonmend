import type { Reporter } from '../../report'
import { IDENT_RE, isDigit, isOddSpace, PUNCT, quoteFamily, STRING_PREFIX_RE } from './chars'
import { scanNumber } from './number'
import { scanRepr } from './repr'
import type { ScanSource } from './source'
import { scanString } from './string'
import type { Token, TokenKind } from './token'

/**
 * Lenient single-pass tokenizer for a superset of JSON, Python literals and JS object literals.
 * It never throws: anything it can't classify becomes an `unknown` token for the parser to skip.
 */
export class Lexer implements ScanSource {
  readonly text: string
  readonly end: number
  readonly reporter: Reporter
  readonly stats = { curlyQuotes: 0, rawNewlines: 0 }
  private i: number
  private readonly buffer: Token[] = []
  private comments = 0
  private oddSpaces = 0

  constructor(text: string, start: number, end: number, reporter: Reporter) {
    this.text = text
    this.i = start
    this.end = end
    this.reporter = reporter
  }

  peek(ahead = 0): Token {
    while (this.buffer.length <= ahead) this.buffer.push(this.scan())
    return this.buffer[ahead]
  }

  /** End offset of the last token returned by `next()`. */
  lastEnd = 0

  next(): Token {
    const token = this.buffer.shift() ?? this.scan()
    this.lastEnd = token.end
    return token
  }

  /** Reports the aggregated, low-importance observations. Call once after parsing. */
  finish(): void {
    const add = (n: number, code: string, message: string, severity: 'info' | 'warn') => {
      if (n > 0) this.reporter.add({ severity, category: 'normalize', code, message })
    }
    add(this.comments, 'normalize.comments', `Removed ${n(this.comments, 'comment')}`, 'info')
    add(
      this.oddSpaces,
      'normalize.whitespace',
      `Ignored ${n(this.oddSpaces, 'non-standard whitespace character')} (NBSP, zero-width, BOM)`,
      'info',
    )
    add(
      this.stats.curlyQuotes,
      'normalize.smart-quotes',
      `Treated ${n(this.stats.curlyQuotes, 'curly-quoted string')} as normal strings`,
      'warn',
    )
    add(
      this.stats.rawNewlines,
      'structure.raw-newline',
      `Escaped ${n(this.stats.rawNewlines, 'raw line break')} inside strings`,
      'info',
    )
  }

  private advance(token: Token): Token {
    this.i = token.end
    return token
  }

  private scan(): Token {
    const { text, end } = this
    const wsStart = this.i
    let newlineBefore = false
    while (this.i < end) {
      const c = text.charCodeAt(this.i)
      if (c === 0x0a || c === 0x0d) {
        newlineBefore = true
        this.i++
      } else if (c === 0x20 || c === 0x09 || c === 0x0b || c === 0x0c) {
        this.i++
      } else if (isOddSpace(c)) {
        this.oddSpaces++
        this.i++
      } else if (c === 0x23 || (c === 0x2f && text[this.i + 1] === '/')) {
        // `#` and `//` comments run to the end of the line.
        this.comments++
        const eol = text.indexOf('\n', this.i)
        this.i = eol === -1 || eol > end ? end : eol
      } else if (c === 0x2f && text[this.i + 1] === '*') {
        this.comments++
        const close = text.indexOf('*/', this.i + 2)
        const stop = close === -1 || close + 2 > end ? end : close + 2
        if (text.slice(this.i, stop).includes('\n')) newlineBefore = true
        this.i = stop
      } else {
        break
      }
    }
    const spaceBefore = this.i > wsStart
    const start = this.i
    const tok = (kind: TokenKind, stop: number, value: string): Token => {
      this.i = stop
      return { kind, start, end: stop, value, newlineBefore, spaceBefore }
    }

    if (start >= end) return tok('eof', end, '')

    const c = text.charCodeAt(start)
    const ch = text[start]

    if (quoteFamily(c)) return this.advance(scanString(this, start, '', newlineBefore, spaceBefore))
    if (ch === '<') {
      const stop = scanRepr(this, start)
      return tok('repr', stop, text.slice(start, stop))
    }
    if (ch === '.' && text.startsWith('...', start)) return tok('ellipsis', start + 3, '...')
    if (c === 0x2026) return tok('ellipsis', start + 1, '...')
    if ((c >= 0x30 && c <= 0x39) || (ch === '.' && isDigit(text.charCodeAt(start + 1)))) {
      return this.advance(scanNumber(this, start, newlineBefore, spaceBefore))
    }

    IDENT_RE.lastIndex = start
    const m = IDENT_RE.exec(text)
    if (m && start + m[0].length <= end) {
      let stop = start + m[0].length
      if (STRING_PREFIX_RE.test(m[0]) && quoteFamily(text.charCodeAt(stop))) {
        return this.advance(scanString(this, start, m[0], newlineBefore, spaceBefore))
      }
      // Join dotted names: `datetime.timezone.utc`.
      while (text[stop] === '.') {
        IDENT_RE.lastIndex = stop + 1
        const part = IDENT_RE.exec(text)
        if (!part || stop + 1 + part[0].length > end) break
        stop += 1 + part[0].length
      }
      return tok('ident', stop, text.slice(start, stop))
    }

    if (PUNCT.has(ch)) return tok('punct', start + 1, ch)
    const cp = text.codePointAt(start) ?? c
    const width = cp > 0xffff ? 2 : 1
    return tok('unknown', start + width, text.slice(start, start + width))
  }
}

const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
