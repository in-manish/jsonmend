/**
 * HTML formatter. Pure TS, no DOM. Re-indents markup and re-flows text; it never adds, removes or
 * reorders anything but whitespace, and verifies that before returning (otherwise the input comes
 * back unchanged with an error). With template mode on, Django / Jinja tags are opaque atoms.
 */
import { Parser } from './markup/parser'
import { Printer } from './markup/printer'
import { checkTemplate, looksLikeTemplate, scanTemplate, type TplToken } from './template/index'
import {
  DEFAULT_HTML_OPTIONS,
  type HtmlIssue,
  type HtmlOptions,
  type HtmlResult,
  lineOf,
  lineStarts,
} from './types'

export type { Edit, HtmlIssue, HtmlOptions, HtmlResult } from './types'
export { applyEdits, DEFAULT_HTML_OPTIONS } from './types'

const squash = (s: string) => s.replace(/\s+/g, '')

export function formatHtml(input: string, options: Partial<HtmlOptions> = {}): HtmlResult {
  const o: HtmlOptions = { ...DEFAULT_HTML_OPTIONS, ...options }
  const template = o.template === 'on' || (o.template === 'auto' && looksLikeTemplate(input))
  const tokens = template ? scanTemplate(input) : []
  const issues: HtmlIssue[] = template ? checkTemplate(input, tokens) : []

  const parser = new Parser(input, tokens)
  const root = parser.parse()
  issues.push(...parser.issues)
  issues.sort((a, b) => a.from - b.from)

  const tpl = new Map<number, TplToken>()
  for (const t of tokens) if (t.closed) tpl.set(t.from, t)
  const lines = new Printer(o, tpl).children(root.children, 0)
  const output = lines.length ? `${lines.join('\n').replace(/\r\n?/g, '\n')}\n` : ''

  if (squash(output) !== squash(input)) {
    issues.unshift({
      line: lineOf(lineStarts(input), 0),
      from: 0,
      to: 0,
      code: 'verify-failed',
      severity: 'error',
      message: 'Formatting would have changed the content, so the input is shown unchanged.',
    })
    return { output: input, issues, template }
  }
  return { output, issues, template }
}
