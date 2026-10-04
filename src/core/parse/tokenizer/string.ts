import { DELIMITERS, isOddSpace, NEW_ENTRY_RE, type QuoteFamily, quoteFamily } from './chars'
import { readEscape } from './escape'
import type { ScanSource } from './source'
import type { Token } from './token'

/**
 * Strings in every supported quoting style: ' " ` and curly quotes, triple quotes, r/b/u/f
 * prefixes. Recovers from unescaped inner quotes and missing end quotes (reported as guesses).
 */
export function scanString(
  s: ScanSource,
  start: number,
  prefix: string,
  newlineBefore: boolean,
  spaceBefore: boolean,
): Token {
  const { text, end } = s
  const raw = /r/i.test(prefix)
  const isBytes = /b/i.test(prefix)
  let i = start + prefix.length
  const family = quoteFamily(text.charCodeAt(i)) as QuoteFamily
  if (family === 'curly1' || family === 'curly2') s.stats.curlyQuotes++
  const q = text[i]
  const triple = (q === '"' || q === "'") && text.startsWith(q + q + q, i)
  i += triple ? 3 : 1

  let value = ''
  let segment = i
  let closed = false
  let guessed = false
  const flush = (upTo: number) => {
    value += text.slice(segment, upTo)
  }

  while (i < end) {
    const ch = text[i]
    if (triple) {
      if (text.startsWith(q + q + q, i)) {
        flush(i)
        i += 3
        closed = true
        break
      }
    } else if (quoteFamily(text.charCodeAt(i)) === family) {
      if (closesString(s, i, family)) {
        flush(i)
        i++
        closed = true
        break
      }
      guessed = true
      i++
      continue
    }
    if (ch === '\\') {
      flush(i)
      const next = text[i + 1]
      if (next === undefined || i + 1 >= end) {
        i++
        segment = i
        break
      }
      if (raw) {
        // Raw strings keep the backslash, but `\'` still doesn't end the string.
        value += ch + next
        i += 2
      } else {
        i = readEscape(s, i, (s) => {
          value += s
        })
      }
      segment = i
      continue
    }
    if ((ch === '\n' || ch === '\r') && !triple && family !== '`') {
      const lineStart = ch === '\r' && text[i + 1] === '\n' ? i + 2 : i + 1
      const lineEnd = text.indexOf('\n', lineStart)
      if (NEW_ENTRY_RE.test(text.slice(lineStart, lineEnd === -1 ? end : lineEnd))) {
        s.reporter.add({
          severity: 'guess',
          category: 'structure',
          code: 'structure.unclosed-string-eol',
          message: 'Closed a string that was missing its end quote at the end of the line',
          span: { start, end: i },
        })
        flush(i)
        segment = i
        closed = true
        break
      }
      s.stats.rawNewlines++
    }
    i++
  }
  if (!closed) flush(Math.min(i, end))

  if (guessed) {
    s.reporter.add({
      severity: 'guess',
      category: 'structure',
      code: 'structure.inner-quote',
      message: 'Treated quote characters inside a string as text, not as the end of the string',
      span: { start, end: i },
    })
  }
  const token: Token = {
    kind: 'string',
    start,
    end: i,
    value,
    newlineBefore,
    spaceBefore,
    closed,
  }
  if (isBytes) token.bytes = toBytes(value)
  return token
}

export function closesString(s: ScanSource, q: number, family: QuoteFamily): boolean {
  const { text, end } = s
  const after = (from: number) => {
    let j = from
    while (j < end && (text[j] === ' ' || text[j] === '\t' || isOddSpace(text.charCodeAt(j)))) j++
    return j
  }
  const isDelimiterAt = (j: number) =>
    j >= end ||
    DELIMITERS.has(text[j]) ||
    (text[j] === '/' && (text[j + 1] === '/' || text[j + 1] === '*'))

  const j = after(q + 1)
  if (isDelimiterAt(j)) return true
  const nextFamily = quoteFamily(text.charCodeAt(j))
  if (nextFamily === family) {
    // `"he said "hi""`: a second quote followed by a delimiter means this one is inner text.
    return !isDelimiterAt(after(j + 1))
  }
  if (nextFamily) return true
  // A letter or digit follows. It's an inner quote only if a later quote on the same line
  // properly closes the string.
  for (let k = j; k < end; k++) {
    const ch = text[k]
    if (ch === '\n') return true
    if (ch === '\\') {
      k++
      continue
    }
    // `, "next"` or `: "value"` ahead is structure, so this quote really ends the string.
    if ((ch === ',' || ch === ':') && quoteFamily(text.charCodeAt(after(k + 1))) === family) {
      return true
    }
    if (quoteFamily(text.charCodeAt(k)) === family && isDelimiterAt(after(k + 1))) return false
  }
  return true
}

/** Bytes literal text to bytes: code units up to 0xff are bytes, anything else is UTF-8. */
function toBytes(value: string): Uint8Array {
  const out: number[] = []
  const encoder = new TextEncoder()
  for (const ch of value) {
    const c = ch.codePointAt(0) ?? 0
    if (c <= 0xff) out.push(c)
    else out.push(...encoder.encode(ch))
  }
  return Uint8Array.from(out)
}
