/** Tokens of a Django / Jinja expression (the inside of `{{ }}` or the arguments of a tag). */
export type Tok =
  | { k: 'str'; v: string }
  | { k: 'num'; v: number }
  | { k: 'name'; v: string }
  | { k: 'op'; v: string }

const TWO = new Set(['==', '!=', '<=', '>=', '**', '//'])
const ONE = new Set('<>()[]{},.|:+-*/%~=')

export class ExprError extends Error {}

export function lex(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
    } else if (c === '"' || c === "'") {
      let s = ''
      i++
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\' && i + 1 < src.length) i++
        s += src[i++]
      }
      if (i >= src.length) throw new ExprError('unclosed string')
      i++
      out.push({ k: 'str', v: s })
    } else if (/\d/.test(c)) {
      const m = /^\d+(\.\d+)?/.exec(src.slice(i)) as RegExpExecArray
      out.push({ k: 'num', v: Number(m[0]) })
      i += m[0].length
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_]\w*/.exec(src.slice(i)) as RegExpExecArray
      out.push({ k: 'name', v: m[0] })
      i += m[0].length
    } else if (TWO.has(src.slice(i, i + 2))) {
      out.push({ k: 'op', v: src.slice(i, i + 2) })
      i += 2
    } else if (ONE.has(c)) {
      out.push({ k: 'op', v: c })
      i++
    } else throw new ExprError(`unexpected "${c}"`)
  }
  return out
}
