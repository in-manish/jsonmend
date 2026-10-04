import type { ArrayNode, Node, ObjectNode } from './ast'

export class ParseError extends Error {
  readonly offset: number

  constructor(message: string, offset: number) {
    super(message)
    this.name = 'ParseError'
    this.offset = offset
  }
}

const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y

interface Frame {
  node: ObjectNode | ArrayNode
  /** Object frames: key of the value currently being parsed. */
  key?: Node
}

/**
 * Strict RFC 8259 parser producing the lossless AST (raw number tokens, ordered entries with
 * duplicates). This is the pipeline's fast path; `JSON.parse` can't be used because it rounds
 * big integers and drops duplicate keys.
 *
 * Containers are tracked on an explicit stack rather than by recursion, so nesting up to
 * `maxDepth` can't overflow the call stack.
 */
export function parseStrictJson(text: string, maxDepth = 10_000): Node {
  const n = text.length
  let i = 0

  const fail = (message: string, at = i): never => {
    throw new ParseError(i >= n && at >= n ? 'Unexpected end of input' : message, at)
  }

  const skipWs = () => {
    while (i < n) {
      const c = text.charCodeAt(i)
      if (c !== 0x20 && c !== 0x0a && c !== 0x0d && c !== 0x09) return
      i++
    }
  }

  const expected = (what: string) => {
    const ch = text[i]
    return `Expected ${what} but found ${ch === undefined ? 'end of input' : JSON.stringify(ch)}`
  }

  const literal = <T extends Node>(word: string, node: T): T => {
    if (!text.startsWith(word, i)) fail(`Unexpected token ${JSON.stringify(text[i])}`)
    node.span = { start: i, end: i + word.length }
    i += word.length
    return node
  }

  const parseString = (): Node => {
    const start = i
    let escaped = false
    i++
    while (i < n) {
      const c = text.charCodeAt(i)
      if (c === 0x22) break
      if (c === 0x5c) {
        escaped = true
        i += 2
        continue
      }
      if (c < 0x20) fail('Unescaped control character in string')
      i++
    }
    if (i >= n) fail('Unterminated string', start)
    i++
    const raw = text.slice(start, i)
    let value: string
    try {
      value = escaped ? (JSON.parse(raw) as string) : raw.slice(1, -1)
    } catch {
      return fail('Invalid escape sequence in string', start)
    }
    return { kind: 'string', value, span: { start, end: i } }
  }

  const parseNumber = (): Node => {
    NUMBER_RE.lastIndex = i
    const m = NUMBER_RE.exec(text)
    if (!m) return fail('Invalid number')
    const start = i
    i += m[0].length
    return { kind: 'number', raw: m[0], span: { start, end: i } }
  }

  /** Reads `"key" :` and leaves `i` at the value. */
  const parseKey = (frame: Frame) => {
    skipWs()
    if (text[i] !== '"') fail(expected('a double-quoted key'))
    frame.key = parseString()
    skipWs()
    if (text[i] !== ':') fail(expected("':' after key"))
    i++
  }

  const parseScalar = (): Node => {
    switch (text[i]) {
      case '"':
        return parseString()
      case 't':
        return literal('true', { kind: 'boolean', value: true })
      case 'f':
        return literal('false', { kind: 'boolean', value: false })
      case 'n':
        return literal('null', { kind: 'null' })
      case '-':
        return parseNumber()
      default: {
        const c = text.charCodeAt(i)
        if (c >= 0x30 && c <= 0x39) return parseNumber()
        return fail(i >= n ? 'Unexpected end of input' : expected('a JSON value'))
      }
    }
  }

  const stack: Frame[] = []

  for (;;) {
    skipWs()
    let value: Node
    const c = text[i]
    if (c === '{' || c === '[') {
      if (stack.length >= maxDepth) fail(`Nesting is deeper than the ${maxDepth}-level limit`)
      const start = i
      const node: ObjectNode | ArrayNode =
        c === '{'
          ? { kind: 'object', entries: [], span: { start, end: start } }
          : { kind: 'array', items: [], span: { start, end: start } }
      i++
      skipWs()
      if (text[i] !== (c === '{' ? '}' : ']')) {
        const frame: Frame = { node }
        stack.push(frame)
        if (node.kind === 'object') parseKey(frame)
        continue
      }
      i++
      value = node
    } else {
      value = parseScalar()
    }

    // Attach the finished value to its parent, closing every container that ends here.
    for (;;) {
      const frame = stack.at(-1)
      if (!frame) {
        skipWs()
        if (i < n) fail(expected('end of input after the top-level value'))
        return value
      }
      const { node } = frame
      if (node.kind === 'object') node.entries.push({ key: frame.key as Node, value })
      else node.items.push(value)
      skipWs()
      if (text[i] === ',') {
        i++
        if (node.kind === 'object') parseKey(frame)
        break
      }
      const closer = node.kind === 'object' ? '}' : ']'
      if (text[i] !== closer) fail(expected(`',' or '${closer}'`))
      i++
      ;(node.span as { end: number }).end = i
      stack.pop()
      value = node
    }
  }
}
