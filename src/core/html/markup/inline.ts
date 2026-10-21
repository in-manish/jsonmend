import type { TplToken } from '../template/index'
import { type El, INLINE, isWs, type Node, type Text, VOID } from './model'

/** A word or tag in a line of flowing content. */
export interface Piece {
  s: string
  /** Whitespace separated this piece from the previous one in the source. */
  sp: boolean
}

export const openStr = (el: El): string =>
  `<${el.name}${el.attrs.length ? ` ${el.attrs.join(' ')}` : ''}${el.selfClose ? ' /' : ''}>`

export const hasEndTag = (el: El): boolean =>
  el.hasClose && !VOID.has(el.name.toLowerCase()) && !el.selfClose

export function isInlineNode(n: Node): boolean {
  if (n.k === 'text') return true
  if (n.k === 'block') return false
  return isInlineEl(n)
}

function isInlineEl(el: El): boolean {
  return INLINE.has(el.name.toLowerCase()) && !el.rawBody && el.children.every(isInlineNode)
}

/** Splits text into words; template tokens never split. */
function words(t: Text, tpl: Map<number, TplToken>): string[] {
  const out: string[] = []
  let cur = ''
  for (let i = 0; i < t.s.length; ) {
    const end = tpl.get(t.from + i)?.to
    if (end !== undefined) {
      cur += t.s.slice(i, end - t.from)
      i = end - t.from
    } else if (isWs(t.s[i])) {
      if (cur) out.push(cur)
      cur = ''
      i++
    } else cur += t.s[i++]
  }
  if (cur) out.push(cur)
  return out
}

/** Flattens inline nodes into words and tags, remembering where the source had whitespace. */
export function pieces(
  nodes: Node[],
  out: Piece[],
  st: { pending: boolean },
  tpl: Map<number, TplToken>,
) {
  for (const n of nodes) {
    if (n.k === 'text') {
      const ws = words(n, tpl)
      if (ws.length === 0) {
        if (n.s) st.pending = true
        continue
      }
      st.pending = st.pending || isWs(n.s[0])
      for (const w of ws) {
        out.push({ s: w, sp: st.pending })
        st.pending = true
      }
      st.pending = isWs(n.s[n.s.length - 1])
    } else if (n.k === 'el') {
      out.push({ s: openStr(n), sp: st.pending })
      st.pending = false
      pieces(n.children, out, st, tpl)
      if (hasEndTag(n)) {
        out.push({ s: `</${n.name}>`, sp: st.pending })
        st.pending = false
      }
    }
  }
}

/** Greedy wrap at pieces that had whitespace before them; other joins are never broken. */
export function wrap(items: Piece[], ind: string, width: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const p of items) {
    if (cur === '') cur = ind + p.s
    else if (p.sp && cur.length + 1 + p.s.length > width) {
      lines.push(cur)
      cur = ind + p.s
    } else cur += (p.sp ? ' ' : '') + p.s
  }
  if (cur) lines.push(cur)
  return lines
}
