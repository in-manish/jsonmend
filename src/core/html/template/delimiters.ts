import type { Reporter } from './reporter'
import { OPEN, type TplToken } from './scan'
import { expressionProblem } from './tag'

/** `{{`, `{%` and `{#` that never close, each with a suggested closer. */
export function checkDelimiters(tokens: TplToken[], rep: Reporter) {
  const { src } = rep
  for (const t of tokens) {
    if (t.closed) continue
    const open = src.slice(t.from, t.from + 2)
    const close = OPEN[open].close
    const line = src.slice(t.from, t.to)
    const end = t.from + line.trimEnd().length
    const single = open === '{{' ? /^\{\{[^{}]*\}(?!\})/.exec(line) : undefined
    const percent = open === '{%' ? /^\{%[^{}%]*\}/.exec(line) : undefined
    const hash = open === '{#' ? /^\{#[^{}#]*#(?!\})/.exec(line) : undefined
    // A one-character slip (`}` for `}}`, `}` for `%}`) is repaired in place; else append the closer.
    const fix = single
      ? { from: t.from + single[0].length, to: t.from + single[0].length, insert: '}' }
      : percent
        ? { from: t.from + percent[0].length - 1, to: t.from + percent[0].length, insert: '%}' }
        : hash
          ? { from: t.from + hash[0].length, to: t.from + hash[0].length, insert: '}' }
          : { from: end, to: end, insert: ` ${close}` }
    rep.add(t.from, t.from + 2 + Math.min(line.trimEnd().length - 2, 20), {
      code: 'tpl-unclosed-delimiter',
      message: `"${open}" is never closed`,
      suggestion: `Close it with "${close}".`,
      fixes: [fix],
    })
  }
}

/** Empty `{{ }}` and expressions with unbalanced quotes or brackets. */
export function checkVariables(tokens: TplToken[], rep: Reporter) {
  for (const t of tokens) {
    if (!t.closed || t.kind !== 'var') continue
    const expr = rep.src.slice(t.from + 2, t.to - 2).replace(/^[-+]|[-+]$/g, '')
    if (expr.trim() === '') {
      rep.add(t.from, t.to, {
        code: 'tpl-syntax',
        severity: 'warn',
        message: 'Empty variable "{{ }}"',
        suggestion: 'Put a variable name inside, or delete it.',
      })
      continue
    }
    const problem = expressionProblem(expr)
    if (problem) {
      rep.add(t.from, t.to, { code: 'tpl-syntax', message: `Variable expression: ${problem}` })
    }
  }
}
