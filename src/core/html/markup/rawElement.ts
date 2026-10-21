import { type El, VOID } from './model'

export const isRawBody = (el: El) => el.rawBody !== undefined

/**
 * Lines for script / style / pre / textarea. `pre` and `textarea` are verbatim. Script and style
 * bodies are re-indented, except bodies with a backtick: a multi-line template string would change.
 */
export function rawElementLines(
  el: El,
  open: string[],
  oneLineOpen: string,
  ind: string,
  unit: string,
  width: number,
): string[] {
  const body = el.rawBody ?? ''
  const tail = el.hasClose ? `</${el.name}>` : ''
  const lower = el.name.toLowerCase()
  const last = open[open.length - 1]
  if (lower === 'pre' || lower === 'textarea') return [...open.slice(0, -1), last + body + tail]
  if (body.trim() === '') return [...open.slice(0, -1), last + tail]

  const lines = body.replace(/\r\n?/g, '\n').split('\n')
  while (lines.length && lines[0].trim() === '') lines.shift()
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
  if (
    lines.length === 1 &&
    open.length === 1 &&
    (oneLineOpen + lines[0].trim() + tail).length <= width
  ) {
    return [oneLineOpen + lines[0].trim() + tail]
  }
  const pad = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)?.[0].length ?? 0),
  )
  const inner = body.includes('`')
    ? lines.map((l) => l.trimEnd())
    : lines.map((l) => (l.trim() ? ind + unit + l.slice(pad).trimEnd() : ''))
  return [...open, ...inner, ...(tail ? [ind + tail] : [])]
}

export const isVoid = (el: El) => VOID.has(el.name.toLowerCase()) || el.selfClose
