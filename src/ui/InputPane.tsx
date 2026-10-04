import { python } from '@codemirror/lang-python'
import { lintGutter, setDiagnostics } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { type DragEvent, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatKeymap } from './editor/keymap'
import { toLint } from './editor/lint'
import { baseTheme } from './editor/theme'
import { editors, reveal } from './editor/views'
import { readTextFile } from './lib/files'

export function InputPane({ dark }: { dark: boolean }) {
  const input = useAppStore((s) => s.input)
  const setInput = useAppStore((s) => s.setInput)
  const result = useAppStore((s) => s.result)
  const resultInput = useAppStore((s) => s.resultInput)
  const selected = useAppStore((s) => s.selected)
  const [dragging, setDragging] = useState(false)

  const extensions = useMemo(
    () => [
      python(),
      lintGutter(),
      formatKeymap,
      baseTheme,
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Input: paste data here' }),
      EditorView.updateListener.of((update) => {
        if (!update.selectionSet) return
        const head = update.state.selection.main.head
        const line = update.state.doc.lineAt(head)
        useAppStore.getState().setCursor(line.number, head - line.from + 1)
      }),
    ],
    [],
  )

  // Problem markers, only while the editor still shows the text they were computed for.
  useEffect(() => {
    const view = editors.input
    if (!view) return
    const fresh = result && resultInput === view.state.doc.toString()
    const diagnostics = fresh ? toLint(result.diagnostics, view.state.doc.length) : []
    view.dispatch(setDiagnostics(view.state, diagnostics))
  }, [result, resultInput])

  useEffect(() => {
    const d = selected && result?.diagnostics[selected.index]
    if (d?.span) reveal(editors.input, d.span.start, d.span.end, true)
  }, [selected, result])

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    try {
      setInput(await readTextFile(file))
      useAppStore.getState().notify(`Loaded ${file.name}`)
    } catch (err) {
      useAppStore.getState().notify((err as Error).message)
    }
  }

  return (
    <section
      aria-label="Input"
      className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${dragging ? 'ring-2 ring-[var(--accent)]' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <h2 className="pane-title">Input</h2>
      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={input}
          height="100%"
          className="h-full"
          theme={dark ? 'dark' : 'light'}
          extensions={extensions}
          onChange={setInput}
          placeholder="Paste a Python dict, JS object, log line or broken JSON..."
          onCreateEditor={(view) => {
            editors.input = view
          }}
          basicSetup={{ highlightActiveLine: false, autocompletion: false }}
        />
      </div>
    </section>
  )
}
