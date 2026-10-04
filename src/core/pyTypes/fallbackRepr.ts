/**
 * Everything the registry doesn't recognise.
 *
 *   User(id=1, name='x')            -> {"id": 1, "name": "x"}   (+ "__type__": "User" with typeTag)
 *   Wrapper(42)                      -> 42
 *   Point(1, 2)                      -> [1, 2]
 *   <__main__.User object at 0x7f>   -> "<__main__.User object at 0x7f>" | null | "<__main__.User object>"
 *   ...  /  [...]                    -> "..." / "[...]"
 */
import { arr, type CallNode, type Entry, type JsonNode, nul, obj, type ReprNode, str } from '../ast'
import { lastSegment, type TransformContext } from './common'

export function unknownCallToJson(call: CallNode, ctx: TransformContext): JsonNode {
  const name = lastSegment(call.name)
  const tag: Entry[] = ctx.opts.typeTag ? [{ key: str('__type__'), value: str(call.name) }] : []
  let result: JsonNode
  let message: string
  if (call.kwargs.length > 0) {
    const entries: Entry[] = [...tag]
    if (call.args.length > 0) {
      entries.push({ key: str('args'), value: arr(call.args.map((a) => ctx.convert(a))) })
    }
    for (const kw of call.kwargs) entries.push({ key: str(kw.name), value: ctx.convert(kw.value) })
    result = obj(entries)
    message = `Converted ${name}(...) to an object`
  } else if (call.args.length === 1 && tag.length === 0) {
    result = ctx.convert(call.args[0])
    message = `Unwrapped ${name}(...) to its argument`
  } else if (tag.length > 0) {
    result = obj([...tag, { key: str('args'), value: arr(call.args.map((a) => ctx.convert(a))) }])
    message = `Converted ${name}(...) to an object`
  } else {
    result = arr(call.args.map((a) => ctx.convert(a)))
    message = `Converted ${name}(...) to an array of its arguments`
  }
  return ctx.converted(call, result, 'type.unknown-call', {
    severity: 'warn',
    message,
    highlight: false,
  })
}

export function reprToJson(node: ReprNode, ctx: TransformContext): JsonNode {
  if (node.text === '...' || node.text === '[...]' || node.text === '{...}') {
    return ctx.converted(node, str(node.text), 'type.ellipsis', {
      severity: 'warn',
      message:
        node.text === '...'
          ? 'Kept Ellipsis (...) as a string'
          : `Kept the recursive-reference marker ${node.text} as a string`,
    })
  }
  const mode = ctx.opts.objectRepr
  const result =
    mode === 'null'
      ? nul()
      : mode === 'placeholder'
        ? str(node.text.replace(/ at 0x[0-9a-fA-F]+/, ''))
        : str(node.text)
  return ctx.converted(node, result, 'type.object-repr', { severity: 'warn' })
}
