/**
 * Fills a Django / Jinja template with sample data so it can be previewed. The data is inferred from
 * how the template uses its variables, then merged with any JSON the user supplies. This is a
 * preview aid, not a template engine: unsupported tags and filters are reported, never executed.
 */
import { Scope } from './eval'
import { parseTemplate } from './parse'
import { type RenderCtx, renderNodes } from './render'
import { materialize } from './sample'
import { inferShape } from './shape'
import { deepMerge, isPlainObject } from './value'

export interface FillResult {
  html: string
  /** Data inferred from the template. */
  generated: Record<string, unknown>
  /** What was rendered: `generated` with the user's overrides merged in. */
  data: Record<string, unknown>
  notes: string[]
}

export function fillTemplate(src: string, overrides?: unknown): FillResult {
  const { nodes, notes: parseNotes } = parseTemplate(src)
  const inferred = materialize(inferShape(nodes), 'root')
  const generated = isPlainObject(inferred) ? inferred : {}
  const merged = deepMerge(generated, overrides)
  const data = isPlainObject(merged) ? merged : generated

  const ctx: RenderCtx = { notes: new Set(parseNotes), size: 0 }
  const out: string[] = []
  renderNodes(nodes, new Scope(undefined, data), out, ctx)
  return { html: out.join(''), generated, data, notes: [...ctx.notes] }
}
