/** CSS clean-up for the Gmail simulation: what Gmail drops from `<style>` blocks and `style=""`. */

/** Properties Gmail removes (position can overlay Gmail's own UI). */
const STRIPPED_PROPS = ['position', 'z-index']
/** Gmail removes a whole `<style>` block above this size. */
export const MAX_STYLE_BYTES = 16 * 1024

export interface CssResult {
  css: string
  /** Human-readable list of what was dropped. */
  dropped: string[]
}

const declRe = (prop: string) => new RegExp(`(^|[;{\\s])${prop}\\s*:[^;}]*;?`, 'gi')

/** Removes unsupported declarations from a declaration list or a whole stylesheet. */
export function cleanCss(css: string): CssResult {
  const dropped: string[] = []
  let out = css
  for (const rule of ['@import', '@font-face']) {
    const re = rule === '@import' ? /@import[^;]*;/gi : /@font-face\s*\{[^}]*\}/gi
    if (re.test(out)) dropped.push(`${rule} is ignored`)
    out = out.replace(re, '')
  }
  for (const prop of STRIPPED_PROPS) {
    const re = declRe(prop)
    if (re.test(out)) dropped.push(`"${prop}" is removed`)
    out = out.replace(declRe(prop), '$1')
  }
  if (/expression\s*\(|behavior\s*:|-moz-binding/i.test(out)) {
    dropped.push('scripted CSS (expression, behavior) is removed')
    out = out.replace(
      /[^;{}]*(expression\s*\([^)]*\)|behavior\s*:[^;}]*|-moz-binding[^;}]*);?/gi,
      '',
    )
  }
  return { css: out, dropped }
}
