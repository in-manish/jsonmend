/**
 * {1, 2} / set([...]) / frozenset({...}) -> array, sorted when every item is a number or every
 * item is a string (Python set order is arbitrary), else in source order.
 */
import { type ArrayNode, arr, type JsonNode, type Node } from '../ast'
import { arg, type TransformContext, type TypeHandler } from './common'

export function setToJson(items: Node[], source: Node, ctx: TransformContext): JsonNode {
  const converted = items.map((item) => ctx.convert(item))
  if (ctx.opts.setOrder === 'sorted') sortScalars(converted)
  return ctx.converted(source, arr(converted, source.span), 'type.set', { highlight: false })
}

function sortScalars(items: JsonNode[]) {
  if (items.every((i) => i.kind === 'number')) {
    items.sort((a, b) => Number((a as { raw: string }).raw) - Number((b as { raw: string }).raw))
  } else if (items.every((i) => i.kind === 'string')) {
    items.sort((a, b) => {
      const x = (a as { value: string }).value
      const y = (b as { value: string }).value
      return x < y ? -1 : x > y ? 1 : 0
    })
  }
}

/** Items of an iterable argument: list/tuple/set literals, or a string's characters. */
export function iterableItems(node: Node | undefined): Node[] | undefined {
  if (!node) return []
  if (node.kind === 'array') return node.items
  if (node.kind === 'string') return Array.from(node.value, (c) => ({ kind: 'string', value: c }))
  if (node.kind === 'object') return node.entries.map((e) => e.key)
  return undefined
}

export const setHandler: TypeHandler = {
  names: ['set', 'frozenset'],
  convert(call, ctx) {
    const items = iterableItems(arg(call, 0, 'iterable'))
    return items && setToJson(items, call, ctx)
  },
}

export const isSetLiteral = (node: Node): node is ArrayNode =>
  node.kind === 'array' && node.form === 'set'
