import type { TplToken } from '../template/index'
import type { HtmlOptions } from '../types'
import { isInlineNode, openStr, type Piece, pieces, wrap } from './inline'
import type { El, Node } from './model'
import { isRawBody, isVoid, rawElementLines } from './rawElement'

/** Lays the tree out as indented lines. Only whitespace is decided here, never content. */
export class Printer {
  private unit: string
  private o: HtmlOptions
  private tpl: Map<number, TplToken>

  constructor(o: HtmlOptions, tpl: Map<number, TplToken>) {
    this.o = o
    this.tpl = tpl
    this.unit = o.indent === 'tab' ? '\t' : ' '.repeat(o.indent)
  }

  private ind(depth: number) {
    return this.unit.repeat(depth)
  }

  /** Lines for a run of siblings: inline nodes flow together, blocks start their own lines. */
  children(nodes: Node[], depth: number): string[] {
    const lines: string[] = []
    let buf: Piece[] = []
    const st = { pending: false }
    const flush = () => {
      if (buf.length) lines.push(...wrap(buf, this.ind(depth), this.o.width))
      buf = []
      st.pending = false
    }
    for (const n of nodes) {
      if (isInlineNode(n)) pieces([n], buf, st, this.tpl)
      else {
        flush()
        lines.push(
          ...(n.k === 'block' ? this.verbatim(n.raw, depth) : this.element(n as El, depth)),
        )
      }
    }
    flush()
    return lines
  }

  private verbatim(raw: string, depth: number): string[] {
    const [first, ...rest] = raw.trim().split('\n')
    return [this.ind(depth) + first.trimEnd(), ...rest.map((l) => l.trimEnd())]
  }

  /** The start tag; long ones put one attribute per line. */
  private openLines(el: El, depth: number): string[] {
    const ind = this.ind(depth)
    const one = ind + openStr(el)
    if (one.length <= this.o.width || el.attrs.length < 2) return [one]
    return [
      `${ind}<${el.name}`,
      ...el.attrs.map((a) => ind + this.unit + a),
      `${ind}${el.selfClose ? '/>' : '>'}`,
    ]
  }

  private element(el: El, depth: number): string[] {
    const ind = this.ind(depth)
    const close = `</${el.name}>`
    const open = this.openLines(el, depth)
    if (isVoid(el)) return open
    if (isRawBody(el)) {
      return rawElementLines(el, open, ind + openStr(el), ind, this.unit, this.o.width)
    }

    const last = open[open.length - 1]
    if (!el.children.some((c) => c.k !== 'text' || c.s.trim() !== '')) {
      return [...open.slice(0, -1), last + (el.hasClose ? close : '')]
    }
    const inner = this.children(el.children, depth + 1)
    if (el.children.every(isInlineNode) && open.length === 1 && inner.length === 1 && el.hasClose) {
      const one = ind + openStr(el) + inner[0].trim() + close
      if (one.length <= this.o.width) return [one]
    }
    return [...open, ...inner, ...(el.hasClose ? [ind + close] : [])]
  }
}
