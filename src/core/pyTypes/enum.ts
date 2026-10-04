/**
 * Enum reprs: <Color.RED: 1> -> "RED" (name, default), 1 (value) or "Color.RED" (qualified).
 * Flag combinations like <Perm.R|W: 6> keep the combined name "R|W".
 */
import type { JsonNode, ReprNode } from '../ast'
import { str } from '../ast'
import { parseLenient } from '../parse/lenient'
import { Reporter } from '../report'
import type { TransformContext } from './common'

const ENUM_RE = /^<([\w.]+?)\.([^.:<>]+): ([\s\S]*)>$/

export function enumToJson(node: ReprNode, ctx: TransformContext): JsonNode | undefined {
  const m = ENUM_RE.exec(node.text)
  if (!m) return undefined
  const [, cls, name, valueText] = m
  let result: JsonNode
  if (ctx.opts.enumMode === 'qualified') result = str(`${cls}.${name}`)
  else if (ctx.opts.enumMode === 'name') result = str(name)
  else {
    // Parse the value text in place so spans still point into the input.
    const start = (node.span?.start ?? 0) + node.text.length - 1 - valueText.length
    const value = node.span
      ? parseLenient(ctx.source, start, start + valueText.length, new Reporter(), ctx.opts)
      : undefined
    result = value ? ctx.convert(value) : str(valueText)
  }
  return ctx.converted(node, result, 'type.enum')
}
