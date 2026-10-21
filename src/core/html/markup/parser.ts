import type { TplToken } from '../template/index'
import { type HtmlIssue, lineOf, lineStarts } from '../types'
import { CLOSES_P, type El, IMPLIED, type Node, OPTIONAL_END, RAW_TEXT, VOID } from './model'
import { parseOpenTag } from './tag'

type NewIssue = Pick<HtmlIssue, 'code' | 'message'> & { suggestion?: string }

/** Builds the element tree. Never drops or invents text; problems become issues. */
export class Parser {
  private i = 0
  private tpl = new Map<number, TplToken>()
  readonly root: El = {
    k: 'el',
    name: '#root',
    attrs: [],
    selfClose: false,
    children: [],
    hasClose: true,
    from: 0,
  }
  private stack: El[] = [this.root]
  readonly issues: HtmlIssue[] = []
  private starts: number[]
  private src: string

  constructor(src: string, template: TplToken[]) {
    this.src = src
    for (const t of template) if (t.closed) this.tpl.set(t.from, t)
    this.starts = lineStarts(src)
  }

  private issue(from: number, to: number, i: NewIssue) {
    this.issues.push({ severity: 'warn', ...i, line: lineOf(this.starts, from), from, to })
  }

  private top() {
    return this.stack[this.stack.length - 1]
  }

  private add(n: Node) {
    this.top().children.push(n)
  }

  private tplEnd = (at: number): number | undefined => this.tpl.get(at)?.to

  parse(): El {
    const { src } = this
    let textFrom = 0
    const flush = (to: number) => {
      if (to > textFrom) this.add({ k: 'text', s: src.slice(textFrom, to), from: textFrom })
    }
    /** Emits `src[i, to)` as a verbatim block and moves on. */
    const block = (i: number, to: number) => {
      flush(i)
      this.add({ k: 'block', raw: src.slice(i, to) })
      this.i = textFrom = to
    }
    while (this.i < src.length) {
      const i = this.i
      const skip = this.tplEnd(i)
      if (skip !== undefined) {
        const raw = this.rawTemplateBlock(i)
        if (raw) block(i, raw)
        else this.i = skip
      } else if (src[i] !== '<') {
        this.i++
      } else if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4)
        block(i, end === -1 ? src.length : end + 3)
      } else if (src[i + 1] === '!' || src[i + 1] === '?') {
        const end = src.indexOf('>', i)
        block(i, end === -1 ? src.length : end + 1)
      } else if (src[i + 1] === '/' && /[A-Za-z]/.test(src[i + 2] ?? '')) {
        flush(i)
        this.closeTag(i)
        textFrom = this.i
      } else if (/[A-Za-z]/.test(src[i + 1] ?? '')) {
        flush(i)
        textFrom = i
        if (this.openTag(i)) textFrom = this.i
        else {
          this.issue(i, Math.min(src.length, i + 20), {
            code: 'html-unterminated-tag',
            message: 'This tag is never closed with ">"',
            suggestion: 'Add the missing ">".',
          })
          this.i = i + 1
        }
      } else this.i++
    }
    flush(src.length)
    for (const el of this.stack.slice(1)) this.reportUnclosed(el)
    return this.root
  }

  /** End offset of a `{% comment %}` / `{% verbatim %}` / `{% raw %}` block starting at `at`. */
  private rawTemplateBlock(at: number): number | undefined {
    const m = /^\{%[-+]?\s*(comment|verbatim|raw)\b/.exec(this.src.slice(at, at + 40))
    if (!m) return undefined
    const re = new RegExp(`\\{%[-+]?\\s*end${m[1]}\\b[^%]*%\\}`, 'g')
    re.lastIndex = at
    const end = re.exec(this.src)
    return end ? end.index + end[0].length : undefined
  }

  private openTag(from: number): boolean {
    const { src } = this
    const tag = parseOpenTag(src, from, this.tplEnd)
    if (!tag) return false
    const { name, attrs, selfClose } = tag
    const lower = name.toLowerCase()
    this.closeImplied(lower)
    const el: El = { k: 'el', name, attrs, selfClose, children: [], hasClose: false, from }
    this.add(el)
    this.i = tag.end
    if (selfClose || VOID.has(lower)) {
      el.hasClose = true
    } else if (RAW_TEXT.has(lower)) {
      const re = new RegExp(`</${lower}\\s*>`, 'ig')
      re.lastIndex = tag.end
      const end = re.exec(src)
      el.rawBody = src.slice(tag.end, end ? end.index : src.length)
      el.hasClose = end !== null
      this.i = end ? end.index + end[0].length : src.length
      if (!end) this.reportUnclosed(el)
    } else this.stack.push(el)
    return true
  }

  private closeImplied(opening: string) {
    for (;;) {
      const t = this.top()
      if (t === this.root) return
      const n = t.name.toLowerCase()
      if (IMPLIED[opening]?.includes(n) || (n === 'p' && CLOSES_P.has(opening))) this.stack.pop()
      else return
    }
  }

  private closeTag(from: number) {
    const { src } = this
    const end = src.indexOf('>', from)
    const to = end === -1 ? src.length : end + 1
    this.i = to
    const name = /^<\/([^\s>]+)/.exec(src.slice(from, to))?.[1] ?? ''
    const lower = name.toLowerCase()
    let k = this.stack.length - 1
    while (k > 0 && this.stack[k].name.toLowerCase() !== lower) k--
    if (k === 0) {
      this.add({ k: 'block', raw: src.slice(from, to).replace(/\s+/g, ' ') })
      this.issue(from, to, {
        code: 'html-unmatched',
        message: `</${name}> has no matching <${name}>`,
        suggestion: 'Remove it, or add the opening tag. Inside a template this can be intentional.',
      })
      return
    }
    for (let j = this.stack.length - 1; j > k; j--) this.reportUnclosed(this.stack[j])
    this.stack[k].hasClose = true
    this.stack.length = k
  }

  private reportUnclosed(el: El) {
    if (OPTIONAL_END.has(el.name.toLowerCase())) return
    this.issue(el.from, el.from + el.name.length + 1, {
      code: 'html-unclosed',
      message: `<${el.name}> is never closed`,
      suggestion: `Add </${el.name}> where it should end. Inside a template, if/else branches can open it twice.`,
    })
  }
}
