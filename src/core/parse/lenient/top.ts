import type { Node, Span } from '../../ast'
import type { MultipleValues } from '../../options'
import type { Token } from '../tokenizer'
import { span } from './tokens'
import type { Element, ReportFn } from './types'

/**
 * Decides what the top level means: one value, key/value pairs missing their `{ }`, values
 * missing their `[ ]`, or several documents (NDJSON). Stray closers are reported here.
 */
export function assembleTop(
  items: Element[],
  strays: Token[],
  commas: number,
  report: ReportFn,
  multipleValues: MultipleValues,
): Node | undefined {
  const pairs = items.filter((i): i is Required<Element> => i.key !== undefined)
  let values = items.filter((i) => i.key === undefined).map((i) => i.value)
  const first = items[0]?.key ?? items[0]?.value
  const removeStrays = (skip?: Token) => {
    for (const s of strays) {
      if (s === skip) continue
      report('warn', 'structure.stray-closer', `Removed unmatched ${s.value}`, span(s))
    }
  }

  if (pairs.length > 0) {
    if (values.length > 0) {
      report(
        'warn',
        'structure.dropped-values',
        `Ignored ${values.length} value(s) mixed in with top-level key: value pairs`,
      )
    }
    const closer = strays.find((s) => s.value === '}')
    removeStrays(closer)
    report(
      'warn',
      'structure.implied-object',
      closer ? 'Added the missing opening {' : 'Wrapped top-level key: value pairs in { }',
      first?.span && { start: first.span.start, end: first.span.start },
    )
    return { kind: 'object', entries: pairs, span: first?.span && { ...first.span } }
  }

  // Bare words next to real data are surrounding noise (`{...} done`).
  if (values.length > 1 && values.some((v) => v.kind !== 'name')) {
    const noise = values.filter((v) => v.kind === 'name')
    for (const v of noise) {
      report(
        'info',
        'input.noise',
        `Ignored stray text "${(v as { name: string }).name}"`,
        v.span,
        'input',
      )
    }
    values = values.filter((v) => v.kind !== 'name')
  }

  if (values.length === 0) {
    removeStrays()
    return undefined
  }

  const openBracket = strays.find((s) => s.value === ']')
  const single = values.length === 1 ? values[0] : undefined
  // A complete container followed by a stray ] keeps its shape; a lone scalar becomes [x].
  if (single && (!openBracket || single.kind === 'array' || single.kind === 'object')) {
    removeStrays()
    return single
  }

  const whole: Span | undefined = values[0].span &&
    values.at(-1)?.span && { start: values[0].span.start, end: values.at(-1)?.span?.end ?? 0 }
  removeStrays(openBracket)
  if (openBracket) {
    report('warn', 'structure.implied-array', 'Added the missing opening [', whole)
    return { kind: 'array', items: values, span: whole }
  }
  if (commas > 0) {
    report(
      'info',
      'structure.top-level-sequence',
      'Wrapped comma-separated top-level values in [ ]',
      whole,
    )
    return { kind: 'array', items: values, span: whole }
  }
  const asLines = multipleValues === 'jsonl'
  report(
    'info',
    'structure.multiple-values',
    asLines
      ? `Found ${values.length} top-level values; emitted them as JSON Lines`
      : `Found ${values.length} top-level values; wrapped them in an array`,
    whole,
  )
  return { kind: 'array', items: values, form: asLines ? 'lines' : 'list', span: whole }
}
