import type { Entry, JsonNode, Node } from '../ast'
import type { FormatOptions } from '../options'
import type { Reporter } from '../report'

export type Pair = [key: string, value: Node]

/** Object key text. Non-string keys were already coerced by the transform stage. */
export function keyString(key: Node, compact: (node: JsonNode) => string): string {
  switch (key.kind) {
    case 'string':
      return key.value
    case 'number':
      return key.raw
    case 'boolean':
      return String(key.value)
    case 'null':
      return 'null'
    case 'object':
    case 'array':
      return compact(key)
    default:
      throw new Error(`internal: untransformed ${key.kind} key`)
  }
}

/** Applies the duplicate-key policy; reports one warning per repeated key. */
export function dedupe(
  entries: Entry[],
  opts: FormatOptions,
  reporter: Reporter,
  compact: (node: JsonNode) => string,
): Pair[] {
  const pairs: Pair[] = []
  const seen = new Map<string, number>()
  const merged = new Set<number>()
  for (const { key, value } of entries) {
    const k = keyString(key, compact)
    const at = seen.get(k)
    if (at === undefined) {
      seen.set(k, pairs.length)
      pairs.push([k, value])
      continue
    }
    let action: string
    switch (opts.duplicateKeys) {
      case 'last':
        pairs[at][1] = value
        action = 'kept the last value'
        break
      case 'first':
        action = 'kept the first value'
        break
      case 'suffix': {
        let n = 2
        while (seen.has(`${k}_${n}`)) n++
        const renamed = `${k}_${n}`
        seen.set(renamed, pairs.length)
        pairs.push([renamed, value])
        action = `renamed to ${JSON.stringify(renamed)}`
        break
      }
      case 'array': {
        const current = pairs[at][1]
        if (merged.has(at) && current.kind === 'array') current.items.push(value)
        else pairs[at][1] = { kind: 'array', items: [current, value] }
        merged.add(at)
        action = 'merged values into an array'
        break
      }
    }
    reporter.add({
      severity: 'warn',
      category: 'structure',
      code: 'structure.duplicate-key',
      message: `Duplicate key ${JSON.stringify(k)}: ${action}`,
      span: key.span,
    })
  }
  return pairs
}

/** Ordinal (code unit) order, like Python's sort_keys, not locale order. */
export function sortPairs(pairs: Pair[], direction: 'asc' | 'desc'): Pair[] {
  const dir = direction === 'desc' ? -1 : 1
  return pairs.sort(([a], [b]) => (a < b ? -dir : a > b ? dir : 0))
}
