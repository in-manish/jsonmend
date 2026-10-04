import type { JsonNode, Node, Span } from './ast'
import { nul, str } from './ast'
import type { FormatOptions } from './options'
import {
  bytesToJson,
  complexToJson,
  enumToJson,
  findHandler,
  normalizeDateString,
  reprToJson,
  setToJson,
  type TransformContext,
  unknownCallToJson,
} from './pyTypes'
import type { Reporter } from './report'
import { toCompactJson } from './serialize'

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 3)}...` : s)

/**
 * Turns the lenient AST (Python/JS types) into plain JSON nodes, reporting every conversion.
 * Handlers live in `pyTypes/`; this file only dispatches.
 */
export function transform(
  root: Node,
  source: string,
  opts: FormatOptions,
  reporter: Reporter,
): JsonNode {
  const snippet = (span?: Span) => (span ? source.slice(span.start, span.end) : '')

  const ctx: TransformContext = {
    opts,
    source,
    reporter,
    snippet,
    convert,
    converted(node, result, code, o = {}) {
      const original = truncate(snippet(node.span), 200)
      const converted = truncate(toCompactJson(result), 200)
      const idx = reporter.add({
        severity: o.severity ?? 'info',
        category: 'type',
        code,
        message: o.message ?? `${truncate(original, 60)} -> ${truncate(converted, 60)}`,
        span: node.span,
        original,
        converted,
      })
      if (o.highlight !== false && idx >= 0) result.mark = idx
      result.span ??= node.span
      return result
    },
    warn(node, code, message) {
      reporter.add({ severity: 'warn', category: 'type', code, message, span: node.span })
    },
  }

  function convertKey(key: Node): JsonNode {
    const converted = convert(key)
    if (converted.kind !== 'object' && converted.kind !== 'array') return converted
    const text = opts.keyCoercion === 'source' ? snippet(key.span) : toCompactJson(converted)
    return ctx.converted(key, str(text), 'type.key', {
      message: `Converted non-string key ${truncate(snippet(key.span), 40)} to a string`,
    })
  }

  function convert(node: Node): JsonNode {
    switch (node.kind) {
      case 'number':
      case 'boolean':
      case 'null':
        return node
      case 'string': {
        if (!opts.normalizeDateStrings) return node
        const iso = normalizeDateString(node.value)
        return iso ? ctx.converted(node, str(iso), 'type.date-string') : node
      }
      case 'array': {
        if (node.form === 'set') return setToJson(node.items, node, ctx)
        const result = { ...node, items: node.items.map(convert) }
        if (node.form === 'tuple') {
          result.form = 'list'
          return ctx.converted(node, result, 'type.tuple', { highlight: false })
        }
        return result
      }
      case 'object':
        return {
          ...node,
          entries: node.entries.map((e) => ({ key: convertKey(e.key), value: convert(e.value) })),
        }
      case 'nonfinite': {
        const result = opts.nonFinite === 'string' ? str(node.value) : nul()
        return ctx.converted(node, result, 'type.nonfinite', {
          severity: 'warn',
          message: `${node.value} is not valid JSON; wrote ${opts.nonFinite === 'string' ? `"${node.value}"` : 'null'}`,
        })
      }
      case 'complex':
        return complexToJson(node, ctx)
      case 'bytes':
        return bytesToJson(node, ctx)
      case 'repr':
        return enumToJson(node, ctx) ?? reprToJson(node, ctx)
      case 'name':
        return ctx.converted(node, str(node.name), 'type.bare-word', {
          severity: 'warn',
          message: `Treated bare word ${truncate(node.name, 40)} as a string`,
        })
      case 'call':
        return findHandler(node.name)?.convert(node, ctx) ?? unknownCallToJson(node, ctx)
    }
  }

  return convert(root)
}
