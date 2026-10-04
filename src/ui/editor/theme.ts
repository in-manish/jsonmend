import { EditorView } from '@codemirror/view'

/** Sizing and fonts shared by both editors; colours come from CSS variables in index.css. */
export const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: 'var(--panel)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.5' },
  '.cm-gutters': { backgroundColor: 'var(--panel)', borderRight: '1px solid var(--border)' },
  '&.cm-focused': { outline: 'none' },
})
