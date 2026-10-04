import { EditorView } from '@codemirror/view'

/** The live editor views, so the report panel can reveal locations in them. */
export const editors: { input?: EditorView; output?: EditorView } = {}

/** Selects a range and scrolls it into view; `focus` moves keyboard focus there too. */
export function reveal(view: EditorView | undefined, from: number, to: number, focus = false) {
  if (!view) return
  const length = view.state.doc.length
  const a = Math.min(from, length)
  const b = Math.min(Math.max(to, a), length)
  view.dispatch({
    selection: { anchor: a, head: b },
    effects: EditorView.scrollIntoView(a, { y: 'center' }),
  })
  if (focus) view.focus()
}
