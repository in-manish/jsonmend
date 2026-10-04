import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { type EditorView, ViewPlugin } from '@codemirror/view'
import { copyText } from '../lib/files'

interface Range {
  from: number
  to: number
}

/** The object/array to copy for the hovered position: containers opening or closing on its line. */
export function containerAt(state: EditorState, pos: number): Range | undefined {
  const line = state.doc.lineAt(pos)
  const found: Range[] = []
  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter(node) {
      if (node.name !== 'Object' && node.name !== 'Array') return
      const opens = node.from >= line.from && node.from <= line.to
      const closes = node.to >= line.from && node.to <= line.to
      if (opens || closes) found.push({ from: node.from, to: node.to })
    },
  })
  const containing = found.filter((r) => r.from <= pos && pos <= r.to)
  // Innermost container under the pointer (matters for minified, single-line output).
  return containing.length ? containing[containing.length - 1] : found[0]
}

const ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="5" width="8" height="9" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10"/></svg>'

/** Hovering a line that opens (or closes) an object or array shows a button that copies it. */
export const copyValueButton = ViewPlugin.fromClass(
  class {
    button = document.createElement('button')
    target: Range | undefined
    timer = 0

    view: EditorView

    constructor(view: EditorView) {
      this.view = view
      const b = this.button
      b.type = 'button'
      b.className = 'cm-copy-value'
      b.innerHTML = ICON
      b.hidden = true
      b.addEventListener('click', async () => {
        if (!this.target) return
        const ok = await copyText(view.state.sliceDoc(this.target.from, this.target.to))
        b.title = ok ? 'Copied' : 'Copy failed'
        b.dataset.state = ok ? 'copied' : 'failed'
        window.clearTimeout(this.timer)
        this.timer = window.setTimeout(this.reset, 1200)
      })
      this.reset()
      view.dom.append(b)
      view.dom.addEventListener('mousemove', this.onMove)
      view.dom.addEventListener('mouseleave', this.hide)
      view.scrollDOM.addEventListener('scroll', this.hide)
    }

    reset = () => {
      delete this.button.dataset.state
      this.button.title = 'Copy this value'
      this.button.setAttribute('aria-label', 'Copy this value')
    }

    hide = () => {
      this.button.hidden = true
    }

    onMove = (e: MouseEvent) => {
      if (e.target === this.button || this.button.contains(e.target as Node)) return
      const pos = this.view.posAtCoords({ x: e.clientX, y: e.clientY }, false)
      const range = pos == null ? undefined : containerAt(this.view.state, pos)
      if (!range || pos == null) return this.hide()
      this.target = range
      const line = this.view.lineBlockAt(pos)
      const top = line.top + this.view.documentTop - this.view.dom.getBoundingClientRect().top
      this.button.style.top = `${top}px`
      this.button.hidden = false
    }

    destroy() {
      window.clearTimeout(this.timer)
      this.view.dom.removeEventListener('mousemove', this.onMove)
      this.view.dom.removeEventListener('mouseleave', this.hide)
      this.view.scrollDOM.removeEventListener('scroll', this.hide)
      this.button.remove()
    }
  },
)
