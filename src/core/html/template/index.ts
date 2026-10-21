/**
 * Django / Jinja template support: finds `{{ }}`, `{% %}` and `{# #}` so the HTML formatter can
 * treat them as opaque, and checks them (unclosed delimiters, unbalanced blocks, typos) with
 * suggestions that are plain edits to the input.
 */
import type { HtmlIssue } from '../types'
import { checkBlocks } from './blocks'
import { checkDelimiters, checkVariables } from './delimiters'
import { createReporter } from './reporter'
import { scanTemplate, type TplToken } from './scan'

export { looksLikeTemplate, scanTemplate, type TplToken } from './scan'

export function checkTemplate(src: string, tokens: TplToken[] = scanTemplate(src)): HtmlIssue[] {
  const rep = createReporter(src)
  checkDelimiters(tokens, rep)
  checkVariables(tokens, rep)
  checkBlocks(tokens, rep)
  return rep.issues.sort((a, b) => a.from - b.from)
}
