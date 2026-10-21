import { isWs } from './model'

export interface OpenTag {
  name: string
  attrs: string[]
  selfClose: boolean
  /** Offset just after the `>`. */
  end: number
}

/**
 * Reads the open tag at `from` (`src[from] === '<'`). Template tokens (`tplEnd` gives the end of
 * the one starting at an offset) are atomic, so `{% if %}` and quotes inside them never end an
 * attribute or the tag. Returns undefined when the tag has no closing `>`.
 */
export function parseOpenTag(
  src: string,
  from: number,
  tplEnd: (at: number) => number | undefined,
): OpenTag | undefined {
  let i = from + 1
  while (i < src.length && !isWs(src[i]) && src[i] !== '/' && src[i] !== '>') i++
  const name = src.slice(from + 1, i)
  const attrs: string[] = []
  for (;;) {
    while (i < src.length && isWs(src[i])) i++
    if (i >= src.length) return undefined
    if (src[i] === '>') return { name, attrs, selfClose: false, end: i + 1 }
    if (src[i] === '/' && src[i + 1] === '>') return { name, attrs, selfClose: true, end: i + 2 }
    if (src[i] === '/') {
      i++
      continue
    }
    // One attribute: a name (template tokens count as part of it), then optionally = value.
    const start = i
    while (i < src.length && !isWs(src[i]) && src[i] !== '>' && src[i] !== '=') {
      if (src[i] === '/' && src[i + 1] === '>') break
      i = tplEnd(i) ?? i + 1
    }
    let attr = src.slice(start, i)
    let j = i
    while (j < src.length && isWs(src[j])) j++
    if (src[j] === '=') {
      j++
      while (j < src.length && isWs(src[j])) j++
      const valueStart = j
      if (src[j] === '"' || src[j] === "'") {
        const q = src[j++]
        while (j < src.length && src[j] !== q) j = tplEnd(j) ?? j + 1
        if (j >= src.length) return undefined
        j++
      } else {
        while (j < src.length && !isWs(src[j]) && src[j] !== '>') j = tplEnd(j) ?? j + 1
      }
      attr += `=${src.slice(valueStart, j)}`
      i = j
    }
    if (attr === '') i++
    else attrs.push(attr)
  }
}
