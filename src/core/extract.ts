import type { Span } from './ast'
import type { Reporter } from './report'

export interface Extraction {
  /** The region to parse. */
  start: number
  end: number
  /** Every payload candidate found in noisy text (one entry when the text is clean). */
  payloads: Span[]
  /** Index of the chosen candidate in `payloads`. */
  index: number
}

const FENCE_RE = /```[\w+-]*[ \t]*\r?\n([\s\S]*?)(?:```|$)/g

/** Code around a literal: `data = `, `return `, `print(`, `const x: T = `, `JSON.parse(` ... */
const WRAPPER_RE =
  /(?:export\s+default\s+|module\.exports\s*=\s*|return\s+|(?:var|let|const)\s+[\w$]+\s*(?::[^=]+)?=\s*|[A-Za-z_$][\w$.]*(?:\[[^\]\n]*\])?\s*=(?![=>])\s*|(?:print|pprint|pp|console\.log|json\.loads|json\.dumps|JSON\.parse|JSON\.stringify)\s*\(\s*)/y

const LOG_PREFIX_RE = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/y
const STARTS_VALUE_RE =
  /["'`{[(\-+.\d\u201c\u2018]|(?:True|False|None|true|false|null|NaN|Infinity|nan|inf|undefined)\b|[A-Za-z_$][\w$.]*\s*\(/y
const BRACKETED_WORDS_RE = /^\[[\w .:/-]*\]$/

const isSpace = (c: string | undefined) => c !== undefined && /\s/.test(c)

/**
 * Locates the data inside surrounding noise: markdown fences, assignment/print wrappers, log
 * prefixes and trailing text. When noise hides several payloads, all are returned and the
 * largest (or `payloadIndex`) is chosen.
 */
export function extract(text: string, reporter: Reporter, payloadIndex = -1): Extraction {
  let start = 0
  let end = text.length

  // 1. Markdown code fences: take the largest fenced block.
  let best: [number, number] | undefined
  for (const m of text.matchAll(FENCE_RE)) {
    const s = (m.index ?? 0) + m[0].indexOf('\n') + 1
    const e = s + m[1].length
    if (!best || e - s > best[1] - best[0]) best = [s, e]
  }
  if (best) {
    ;[start, end] = best
    reporter.add({
      severity: 'info',
      category: 'input',
      code: 'input.fence',
      message: 'Used the contents of the ``` code block',
      span: { start, end },
    })
  }

  while (start < end && isSpace(text[start])) start++
  while (end > start && isSpace(text[end - 1])) end--

  // 2. Wrapper code before the literal.
  WRAPPER_RE.lastIndex = start
  const wrapper = WRAPPER_RE.exec(text)
  if (wrapper && wrapper.index === start && start + wrapper[0].length < end) {
    const opened = wrapper[0].trimEnd().endsWith('(')
    reporter.add({
      severity: 'info',
      category: 'input',
      code: 'input.wrapper',
      message: `Ignored surrounding code ${JSON.stringify(wrapper[0].trim())}`,
      span: { start, end: start + wrapper[0].length },
    })
    start += wrapper[0].length
    if (opened) {
      const close = text.lastIndexOf(')', end - 1)
      if (close > start && /^\)?\s*;?\s*$/.test(text.slice(close, end))) end = close
    }
  }
  if (text[end - 1] === ';') {
    end--
    while (end > start && isSpace(text[end - 1])) end--
  }

  // 3. Leading noise (log prefixes, "Response:", prose): collect bracketed candidates.
  LOG_PREFIX_RE.lastIndex = start
  STARTS_VALUE_RE.lastIndex = start
  const isLog = LOG_PREFIX_RE.test(text)
  const startsWithTag =
    text[start] === '[' && BRACKETED_WORDS_RE.test(text.slice(start, balancedEnd(text, start, end)))
  const startsValue = !isLog && !startsWithTag && STARTS_VALUE_RE.test(text)
  if (!startsValue) {
    const payloads = candidates(text, start, end)
    if (payloads.length > 0) {
      const largest = payloads.reduce(
        (b, p, i) => (p.end - p.start > payloads[b].end - payloads[b].start ? i : b),
        0,
      )
      const index = payloadIndex >= 0 && payloadIndex < payloads.length ? payloadIndex : largest
      const chosen = payloads[index]
      reporter.add({
        severity: 'info',
        category: 'input',
        code: 'input.prefix',
        message: `Ignored leading text ${JSON.stringify(clip(text.slice(start, chosen.start).trim()))}`,
        span: { start, end: chosen.start },
      })
      if (payloads.length > 1) {
        reporter.add({
          severity: 'info',
          category: 'input',
          code: 'input.multiple-payloads',
          message: `Found ${payloads.length} payloads in the text; using #${index + 1}`,
        })
      }
      return { start: chosen.start, end: chosen.end, payloads, index }
    }
  }

  // 4. Trailing noise after a bracketed value: `{...} and some text`.
  if ('{[('.includes(text[start])) {
    const close = balancedEnd(text, start, end)
    if (close < end) {
      let rest = close
      while (rest < end && isSpace(text[rest])) rest++
      STARTS_VALUE_RE.lastIndex = rest
      const more = STARTS_VALUE_RE.test(text) && !/^[A-Za-z_$]/.test(text[rest])
      const onlyClosers = /^[\s\]})]+$/.test(text.slice(rest, end))
      if (!more && !onlyClosers && !',:'.includes(text[rest])) {
        reporter.add({
          severity: 'info',
          category: 'input',
          code: 'input.suffix',
          message: `Ignored trailing text ${JSON.stringify(clip(text.slice(rest, end)))}`,
          span: { start: rest, end },
        })
        end = close
      }
    }
  }

  return { start, end, payloads: [{ start, end }], index: 0 }
}

const clip = (s: string) => (s.length > 40 ? `${s.slice(0, 37)}...` : s)

/** Every top-level `{...}` / `[...]` region, skipping bracketed log tags like `[INFO]`. */
function candidates(text: string, start: number, end: number): Span[] {
  const found: Span[] = []
  let i = start
  while (i < end) {
    const ch = text[i]
    if (ch === '{' || ch === '[') {
      const close = balancedEnd(text, i, end)
      if (!BRACKETED_WORDS_RE.test(text.slice(i, close))) found.push({ start: i, end: close })
      i = close
      continue
    }
    i++
  }
  return found
}

/**
 * Index just past the bracket matching the one at `start` (or `end` when it never closes),
 * skipping over quoted strings.
 */
export function balancedEnd(text: string, start: number, end: number): number {
  let depth = 0
  for (let i = start; i < end; i++) {
    const ch = text[i]
    if (ch === '"' || ch === "'" || ch === '`') {
      const triple = text.startsWith(ch.repeat(3), i)
      const q = triple ? ch.repeat(3) : ch
      i += q.length
      while (i < end && !text.startsWith(q, i)) {
        if (text[i] === '\\') i++
        else if (!triple && text[i] === '\n') break
        i++
      }
      i += q.length - 1
    } else if (ch === '{' || ch === '[' || ch === '(') {
      depth++
    } else if (ch === '}' || ch === ']' || ch === ')') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return end
}
