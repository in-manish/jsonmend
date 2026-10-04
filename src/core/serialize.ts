import type { Entry, Node } from './ast'
import type { FormatOptions } from './options'
import type { Diagnostic } from './report'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
const INTEGER_RE = /^-?\d+$/

const SHORT_ESCAPES: Record<number, string> = {
  8: '\\b',
  9: '\\t',
  10: '\\n',
  12: '\\f',
  13: '\\r',
  34: '\\"',
  92: '\\\\',
}

const hex = (c: number) => `\\u${c.toString(16).padStart(4, '0')}`

/** JSON string literal. Lone surrogates are always escaped so the output is valid UTF-8. */
export function quote(s: string, ensureAscii = false, htmlSafe = false): string {
  let out = '"'
  let last = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    let esc: string | undefined
    if (c < 0x20 || c === 0x22 || c === 0x5c) {
      esc = SHORT_ESCAPES[c] ?? hex(c)
    } else if (c >= 0xd800 && c <= 0xdfff) {
      const paired = c <= 0xdbff && (s.charCodeAt(i + 1) & 0xfc00) === 0xdc00
      if (!paired) {
        esc = hex(c)
      } else {
        if (ensureAscii) {
          out += s.slice(last, i) + hex(c) + hex(s.charCodeAt(i + 1))
          last = i + 2
        }
        i++
        continue
      }
    } else if (ensureAscii && c > 0x7e) {
      esc = hex(c)
    } else if (htmlSafe) {
      if (c === 0x2f) esc = '\\/'
      else if (c === 0x3c || c === 0x3e || c === 0x26) esc = hex(c)
    }
    if (esc !== undefined) {
      out += s.slice(last, i) + esc
      last = i + 1
    }
  }
  return `${out + s.slice(last)}"`
}

const isBigInteger = (raw: string) => {
  if (!INTEGER_RE.test(raw)) return false
  const digits = raw.startsWith('-') ? raw.slice(1) : raw
  return digits.length > 15 && BigInt(digits) > MAX_SAFE
}

type Pair = [key: string, value: Node]

/**
 * AST -> JSON text. A custom writer instead of `JSON.stringify` so number tokens, key order,
 * duplicate keys and `__proto__` keys are handled exactly.
 */
export function serialize(
  root: Node,
  opts: FormatOptions,
): { value: string; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []
  const unit = opts.indent === 'tab' ? '\t' : opts.indent === 'none' ? '' : ' '.repeat(opts.indent)
  const pretty = unit !== ''
  const colon = pretty ? ': ' : ':'
  const newlines: string[] = []
  const newline = (depth: number) => {
    newlines[depth] ??= `\n${unit.repeat(depth)}`
    return newlines[depth]
  }
  const out: string[] = []
  let bigIntegers = 0

  const keyString = (key: Node): string => {
    switch (key.kind) {
      case 'string':
        return key.value
      case 'number':
        return key.raw
      case 'boolean':
        return String(key.value)
      case 'null':
        return 'null'
      default:
        return serialize(key, { ...opts, indent: 'none' }).value
    }
  }

  const dedupe = (entries: Entry[]): Pair[] => {
    const pairs: Pair[] = []
    const seen = new Map<string, number>()
    const merged = new Set<number>()
    for (const { key, value } of entries) {
      const k = keyString(key)
      const at = seen.get(k)
      if (at === undefined) {
        seen.set(k, pairs.length)
        pairs.push([k, value])
        continue
      }
      const policy = opts.duplicateKeys
      let action: string
      if (policy === 'last') {
        pairs[at][1] = value
        action = 'kept the last value'
      } else if (policy === 'first') {
        action = 'kept the first value'
      } else if (policy === 'suffix') {
        let n = 2
        while (seen.has(`${k}_${n}`)) n++
        const renamed = `${k}_${n}`
        seen.set(renamed, pairs.length)
        pairs.push([renamed, value])
        action = `renamed to ${JSON.stringify(renamed)}`
      } else {
        const current = pairs[at][1]
        if (merged.has(at) && current.kind === 'array') current.items.push(value)
        else pairs[at][1] = { kind: 'array', items: [current, value] }
        merged.add(at)
        action = 'merged values into an array'
      }
      diagnostics.push({
        severity: 'warn',
        category: 'structure',
        code: 'structure.duplicate-key',
        message: `Duplicate key ${JSON.stringify(k)}: ${action}`,
        span: key.span,
      })
    }
    return pairs
  }

  const sortPairs = (pairs: Pair[]) => {
    const dir = opts.sortKeys === 'desc' ? -1 : 1
    // Ordinal (code unit) order, like Python's sort_keys, not locale order.
    return pairs.sort(([a], [b]) => (a < b ? -dir : a > b ? dir : 0))
  }

  // Explicit work stack instead of recursion so deep nesting can't overflow the call stack.
  // A task is either a node to write or literal text (separators, keys, closers).
  type Task = { node: Node; depth: number } | string
  const tasks: Task[] = [{ node: root, depth: 0 }]

  /** Queues `[prefix, child]` pairs so they pop in order, followed by the closer. */
  const queueChildren = (
    children: [prefix: string, node: Node][],
    depth: number,
    close: string,
  ) => {
    tasks.push(pretty ? newline(depth) + close : close)
    for (let k = children.length - 1; k >= 0; k--) {
      const [prefix, child] = children[k]
      tasks.push({ node: child, depth: depth + 1 })
      tasks.push((k > 0 ? ',' : '') + (pretty ? newline(depth + 1) : '') + prefix)
    }
  }

  for (let task = tasks.pop(); task !== undefined; task = tasks.pop()) {
    if (typeof task === 'string') {
      out.push(task)
      continue
    }
    const { node, depth } = task
    switch (node.kind) {
      case 'null':
        out.push('null')
        break
      case 'boolean':
        out.push(node.value ? 'true' : 'false')
        break
      case 'string':
        out.push(quote(node.value, opts.ensureAscii, opts.htmlSafe))
        break
      case 'number':
        if (isBigInteger(node.raw)) {
          bigIntegers++
          if (opts.bigNumbers === 'string') {
            out.push(`"${node.raw}"`)
            break
          }
        }
        out.push(node.raw)
        break
      case 'array':
        if (node.items.length === 0) {
          out.push('[]')
          break
        }
        out.push('[')
        queueChildren(
          node.items.map((item) => ['', item]),
          depth,
          ']',
        )
        break
      case 'object': {
        let pairs = dedupe(node.entries)
        if (pairs.length === 0) {
          out.push('{}')
          break
        }
        if (opts.sortKeys !== 'none' && (opts.sortDeep || depth === 0)) pairs = sortPairs(pairs)
        out.push('{')
        queueChildren(
          pairs.map(([key, value]) => [quote(key, opts.ensureAscii, opts.htmlSafe) + colon, value]),
          depth,
          '}',
        )
        break
      }
    }
  }

  if (bigIntegers > 0) {
    const asString = opts.bigNumbers === 'string'
    diagnostics.push({
      severity: 'info',
      category: 'output',
      code: asString ? 'output.big-integer-string' : 'output.big-integer-kept',
      message: asString
        ? `Converted ${bigIntegers} integer(s) beyond ±2^53 to strings`
        : `Kept ${bigIntegers} integer(s) beyond ±2^53 digit-for-digit; some JSON parsers will round them`,
    })
  }

  return { value: out.join(''), diagnostics }
}
