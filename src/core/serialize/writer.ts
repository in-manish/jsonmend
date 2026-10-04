import type { JsonNode, Node } from '../ast'
import { DEFAULT_OPTIONS, type FormatOptions } from '../options'
import { Reporter } from '../report'
import { dedupe, sortPairs } from './keys'
import { quote } from './quote'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
const INTEGER_RE = /^-?\d+$/

const isBigInteger = (raw: string) => {
  if (!INTEGER_RE.test(raw)) return false
  const digits = raw.startsWith('-') ? raw.slice(1) : raw
  return digits.length > 15 && BigInt(digits) > MAX_SAFE
}

/** Work items: a node to write, literal text, or the end of a highlighted node. */
type Task =
  | { node: Node; depth: number }
  | { text: string; closerMark?: number }
  | { endMark: number; start: number }

/**
 * JSON nodes -> JSON text. A custom writer instead of `JSON.stringify` so number tokens, key
 * order, duplicate keys and `__proto__` keys are handled exactly. Uses an explicit work stack,
 * so deep nesting can't overflow the call stack. Fills in `outputSpan` on marked diagnostics.
 */
export function serialize(root: JsonNode, opts: FormatOptions, reporter = new Reporter()): string {
  const out: string[] = []
  let pos = 0
  const write = (s: string) => {
    out.push(s)
    pos += s.length
  }
  /** Records (or widens, for repairs touching several places) a diagnostic's output span. */
  const setSpan = (mark: number | undefined, start: number, end: number) => {
    const d = mark === undefined ? undefined : reporter.list[mark]
    if (!d) return
    d.outputSpan = d.outputSpan
      ? { start: Math.min(d.outputSpan.start, start), end: Math.max(d.outputSpan.end, end) }
      : { start, end }
  }
  let bigIntegers = 0

  const run = (node: Node, indent: FormatOptions['indent']) => {
    const unit = indent === 'tab' ? '\t' : indent === 'none' ? '' : ' '.repeat(indent)
    const pretty = unit !== ''
    const colon = pretty ? ': ' : ':'
    const newlines: string[] = []
    const newline = (depth: number) => {
      newlines[depth] ??= `\n${unit.repeat(depth)}`
      return newlines[depth]
    }
    const tasks: Task[] = [{ node, depth: 0 }]

    const queueChildren = (
      children: [prefix: string, node: Node][],
      depth: number,
      close: string,
      closerMark: number | undefined,
    ) => {
      tasks.push({ text: pretty ? newline(depth) + close : close, closerMark })
      for (let k = children.length - 1; k >= 0; k--) {
        const [prefix, child] = children[k]
        tasks.push({ node: child, depth: depth + 1 })
        tasks.push({ text: (k > 0 ? ',' : '') + (pretty ? newline(depth + 1) : '') + prefix })
      }
    }

    for (let task = tasks.pop(); task !== undefined; task = tasks.pop()) {
      if ('text' in task) {
        write(task.text)
        if (task.closerMark !== undefined) setSpan(task.closerMark, pos - 1, pos)
        continue
      }
      if ('endMark' in task) {
        setSpan(task.endMark, task.start, pos)
        continue
      }
      const { node, depth } = task
      if (node.mark !== undefined) tasks.push({ endMark: node.mark, start: pos })
      switch (node.kind) {
        case 'null':
          write('null')
          break
        case 'boolean':
          write(node.value ? 'true' : 'false')
          break
        case 'string':
          write(quote(node.value, opts.ensureAscii, opts.htmlSafe))
          break
        case 'number':
          if (isBigInteger(node.raw)) {
            bigIntegers++
            if (opts.bigNumbers === 'string') {
              write(`"${node.raw}"`)
              break
            }
          }
          write(node.raw)
          break
        case 'array':
          if (node.items.length === 0) {
            write('[]')
            if (node.closerMark !== undefined) setSpan(node.closerMark, pos - 1, pos)
            break
          }
          write('[')
          queueChildren(
            node.items.map((item) => ['', item]),
            depth,
            ']',
            node.closerMark,
          )
          break
        case 'object': {
          let pairs = dedupe(node.entries, opts, reporter, toCompactJson)
          if (opts.sortKeys !== 'none' && (opts.sortDeep || depth === 0)) {
            pairs = sortPairs(pairs, opts.sortKeys)
          }
          if (pairs.length === 0) {
            write('{}')
            if (node.closerMark !== undefined) setSpan(node.closerMark, pos - 1, pos)
            break
          }
          write('{')
          queueChildren(
            pairs.map(([key, value]) => [
              quote(key, opts.ensureAscii, opts.htmlSafe) + colon,
              value,
            ]),
            depth,
            '}',
            node.closerMark,
          )
          break
        }
        default:
          throw new Error(`internal: untransformed ${node.kind} node reached the serializer`)
      }
    }
  }

  if (root.kind === 'array' && root.form === 'lines') {
    // JSON Lines: one minified value per line.
    root.items.forEach((item, idx) => {
      if (idx > 0) write('\n')
      run(item, 'none')
    })
  } else {
    run(root, opts.indent)
  }

  if (bigIntegers > 0) {
    const asString = opts.bigNumbers === 'string'
    reporter.add({
      severity: 'info',
      category: 'output',
      code: asString ? 'output.big-integer-string' : 'output.big-integer-kept',
      message: asString
        ? `Converted ${bigIntegers} integer(s) beyond 2^53 to strings`
        : `Kept ${bigIntegers} integer(s) beyond 2^53 digit-for-digit; some JSON parsers will round them`,
    })
  }

  return out.join('')
}

/** Minified JSON with default options; used for report snippets and non-string keys. */
export function toCompactJson(node: JsonNode): string {
  return serialize(node, { ...DEFAULT_OPTIONS, indent: 'none' })
}
