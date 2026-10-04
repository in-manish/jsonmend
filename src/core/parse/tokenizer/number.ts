import { isDigit } from './chars'
import type { ScanSource } from './source'
import type { Token } from './token'

/**
 * Numbers in JSON, Python and JS spellings (0x/0o/0b, 1_000, .5, 5., 1e5, 10n, 3j), normalized
 * to a valid JSON number token. Rewrites are reported.
 */
export function scanNumber(
  s: ScanSource,
  start: number,
  newlineBefore: boolean,
  spaceBefore: boolean,
): Token {
  const { text, end } = s
  let i = start
  const make = (raw: string, extra: Partial<Token> = {}): Token => {
    const source = text.slice(start, i)
    if (raw !== source && raw.toLowerCase() !== source.toLowerCase().replace(/[jln]$/, '')) {
      s.reporter.add({
        severity: /^0\d/.test(source.replace(/_/g, '')) ? 'warn' : 'info',
        category: 'type',
        code: 'type.number-format',
        message: `Rewrote number ${source} as ${raw}`,
        span: { start, end: i },
        original: source,
        converted: raw,
      })
    }
    return { kind: 'number', start, end: i, value: raw, newlineBefore, spaceBefore, ...extra }
  }

  // 0x / 0o / 0b integers.
  const base = text[i] === '0' ? text[i + 1]?.toLowerCase() : undefined
  if (base === 'x' || base === 'o' || base === 'b') {
    const digits = base === 'x' ? /[0-9a-fA-F_]/ : base === 'o' ? /[0-7_]/ : /[01_]/
    i += 2
    while (i < end && digits.test(text[i])) i++
    const body = text.slice(start + 2, i).replace(/_/g, '')
    if (body) {
      if (text[i] === 'n' || text[i] === 'L' || text[i] === 'l') i++
      return make(BigInt(`0${base}${body}`).toString())
    }
    i = start + 1
    return make('0')
  }

  const readDigits = () => {
    const from = i
    while (i < end && (isDigit(text.charCodeAt(i)) || (text[i] === '_' && i > from))) i++
    return text.slice(from, i).replace(/_/g, '')
  }

  let intPart = readDigits()
  let frac: string | undefined
  if (text[i] === '.' && text[i + 1] !== '.' && !/[\p{L}_$]/u.test(text[i + 1] ?? '')) {
    i++
    frac = readDigits()
  }
  let exp = ''
  if (text[i] === 'e' || text[i] === 'E') {
    const sign = text[i + 1] === '+' || text[i + 1] === '-' ? text[i + 1] : ''
    if (isDigit(text.charCodeAt(i + 1 + sign.length))) {
      i += 1 + sign.length
      exp = `e${sign}${readDigits()}`
    } else if (i + 1 + sign.length >= end) {
      // Truncated exponent at end of input: `1e` / `1e-`.
      i += 1 + sign.length
    }
  }
  let imaginary = false
  if (text[i] === 'j' || text[i] === 'J') {
    imaginary = true
    i++
  } else if (text[i] === 'L' || text[i] === 'l' || text[i] === 'n') {
    i++
  }

  intPart = intPart.replace(/^0+(?=\d)/, '') || '0'
  let raw = intPart
  if (frac !== undefined) raw += `.${frac || '0'}`
  raw += exp
  // Keep the source's exponent letter case when nothing else changed.
  const source = text.slice(start, i)
  if (raw.toLowerCase() === source.toLowerCase()) raw = source
  return make(raw, imaginary ? { imaginary } : {})
}
