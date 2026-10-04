import type { CallNode, JsonNode, Node, Span } from '../ast'
import type { FormatOptions } from '../options'
import type { Reporter, Severity } from '../report'

export interface TransformContext {
  opts: FormatOptions
  /** The full input text; node spans index into it. */
  source: string
  reporter: Reporter
  /** Converts any node (recursively) into JSON nodes. */
  convert(node: Node): JsonNode
  /**
   * Records a type conversion: a report row with the source snippet and the resulting JSON,
   * and a mark so the output span can be highlighted. Returns `result` for chaining.
   */
  converted(
    node: Node,
    result: JsonNode,
    code: string,
    opts?: { severity?: Severity; message?: string; highlight?: boolean },
  ): JsonNode
  /** A warning tied to `node` that isn't a conversion (invalid values, lossy fallbacks). */
  warn(node: Node, code: string, message: string): void
  /** Source text of a node, for fallbacks and report snippets. */
  snippet(span?: Span): string
}

/**
 * One handler per Python/JS type. `names` are matched against the full dotted call name first
 * (`datetime.datetime`), then against its last segment (`datetime`).
 */
export interface TypeHandler {
  names: string[]
  convert(call: CallNode, ctx: TransformContext): JsonNode | undefined
}

/** Positional argument `index`, or keyword argument `name`. */
export function arg(call: CallNode, index: number, name?: string): Node | undefined {
  if (name) {
    const kw = call.kwargs.find((k) => k.name === name)
    if (kw) return kw.value
  }
  return index >= 0 ? call.args[index] : undefined
}

/** Integer value of a number node (or undefined when it isn't a plain integer). */
export function intValue(node: Node | undefined): number | undefined {
  if (node?.kind !== 'number' || !/^-?\d+$/.test(node.raw)) return undefined
  return Number(node.raw)
}

export function numberValue(node: Node | undefined): number | undefined {
  return node?.kind === 'number' ? Number(node.raw) : undefined
}

export function stringValue(node: Node | undefined): string | undefined {
  return node?.kind === 'string' ? node.value : undefined
}

export const lastSegment = (name: string) => name.slice(name.lastIndexOf('.') + 1)

export const pad = (n: number, width: number) => String(Math.abs(n)).padStart(width, '0')

export const JSON_NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

/** Coerces numeric text like `+.5`, `5.`, `007`, `1_000` into a JSON number token. */
export function toJsonNumber(text: string): string | undefined {
  const t = text.trim().replace(/_/g, '')
  if (JSON_NUMBER_RE.test(t)) return t
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(t)
  if (!m || (!m[2] && !m[3])) return undefined
  const sign = m[1] === '-' ? '-' : ''
  const int = m[2].replace(/^0+(?=\d)/, '') || '0'
  const frac = m[3] === undefined ? '' : `.${m[3] || '0'}`
  const exp = m[4] === undefined ? '' : `e${m[4]}`
  return `${sign}${int}${frac}${exp}`
}
