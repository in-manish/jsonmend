import type { TplToken } from './scan'

export interface Parsed {
  tok: TplToken
  name: string
  /** Everything after the name, without whitespace-control markers. */
  rest: string
  /** Offsets of the name inside the source. */
  nameFrom: number
  nameTo: number
}

export function parseTag(src: string, tok: TplToken): Parsed | undefined {
  const m = /^\{%[-+]?\s*([A-Za-z_]\w*)/.exec(src.slice(tok.from, tok.to))
  if (!m) return undefined
  const nameFrom = tok.from + m[0].length - m[1].length
  const rest = src
    .slice(nameFrom + m[1].length, tok.to - 2)
    .replace(/[-+]$/, '')
    .trim()
  return { tok, name: m[1], rest, nameFrom, nameTo: nameFrom + m[1].length }
}

/** First problem in the expression of a `{{ }}` or `{% %}`, if any. */
export function expressionProblem(expr: string): string | undefined {
  const closers: string[] = []
  const pair: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
  let quote = ''
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = ''
    } else if (c === '"' || c === "'") quote = c
    else if (pair[c]) closers.push(pair[c])
    else if (c === ')' || c === ']' || c === '}') {
      if (closers.pop() !== c) return `unexpected "${c}"`
    }
  }
  if (quote) return `the ${quote === '"' ? 'double' : 'single'} quote is never closed`
  if (closers.length) return `"${closers[closers.length - 1]}" is missing`
  if (/\|\s*$/.test(expr)) return 'a filter name is missing after "|"'
  return undefined
}

/** Levenshtein distance, for "did you mean" on mistyped end tags. */
export function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}
