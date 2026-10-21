// Regression test for text before an opening tag being attached to the wrong parent.
// (Named dbg.test.ts by accident; safe to rename to htmlText.test.ts.)
import { expect, it } from 'vitest'
import { formatHtml } from '../../src/core/html/format'

it('keeps text that precedes an opening tag', () => {
  for (const src of ['{% if a %}<p>x</p>', 'a <p>x</p>', '{{ a }}\n<div>b</div>\n']) {
    const r = formatHtml(src, { template: 'on' })
    expect(r.issues.map((i) => i.code)).not.toContain('verify-failed')
    expect(r.output.replace(/\s+/g, '')).toBe(src.replace(/\s+/g, ''))
  }
})
