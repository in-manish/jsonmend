/** Finds Django / Jinja `{{ }}`, `{% %}` and `{# #}` in a source string. */

export interface TplToken {
  kind: 'var' | 'tag' | 'comment'
  from: number
  to: number
  closed: boolean
}

export const OPEN: Record<string, { kind: TplToken['kind']; close: string }> = {
  '{{': { kind: 'var', close: '}}' },
  '{%': { kind: 'tag', close: '%}' },
  '{#': { kind: 'comment', close: '#}' },
}

export function looksLikeTemplate(src: string): boolean {
  return /\{[{%#]/.test(src)
}

/**
 * Every template token in order. A token is `closed` when its closer is found before another
 * `{{` / `{%` opens; an unclosed one spans to the end of its line.
 */
export function scanTemplate(src: string): TplToken[] {
  const tokens: TplToken[] = []
  let i = 0
  while (i < src.length - 1) {
    const open = src[i] === '{' ? OPEN[src.slice(i, i + 2)] : undefined
    if (!open) {
      i++
      continue
    }
    const end = src.indexOf(open.close, i + 2)
    const rival = src.slice(i + 2, end === -1 ? undefined : end).search(/\{[{%]/)
    if (end !== -1 && (rival === -1 || open.kind === 'comment')) {
      tokens.push({ kind: open.kind, from: i, to: end + 2, closed: true })
      i = end + 2
      // The body of {% comment %} / {% verbatim %} / {% raw %} is not template code.
      const rawOpen =
        open.kind === 'tag'
          ? /^\{%[-+]?\s*(comment|verbatim|raw)\b/.exec(
              src.slice(tokens[tokens.length - 1].from, i),
            )
          : null
      if (rawOpen) {
        const close = new RegExp(`\\{%[-+]?\\s*end${rawOpen[1]}\\b`).exec(src.slice(i))
        if (close) i += close.index
      }
    } else {
      const nl = src.indexOf('\n', i)
      tokens.push({ kind: open.kind, from: i, to: nl === -1 ? src.length : nl, closed: false })
      i += 2
    }
  }
  return tokens
}
