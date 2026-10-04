import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useMemo } from 'react'
import { countBySeverity } from '../core/report'
import { useAppStore } from '../store/useAppStore'
import { EmptyState } from './EmptyState'
import { marksField, outputMarks, setMarks } from './editor/marks'
import { baseTheme } from './editor/theme'
import { editors, reveal } from './editor/views'
import { TreeView } from './tree/TreeView'

export function OutputPane({ dark }: { dark: boolean }) {
  const result = useAppStore((s) => s.result)
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const selected = useAppStore((s) => s.selected)
  const output = result?.ok ? result.output : ''

  const extensions = useMemo(
    () => [
      json(),
      marksField,
      baseTheme,
      EditorView.contentAttributes.of({ 'aria-label': 'Formatted JSON output' }),
    ],
    [],
  )

  // Value changes are applied by the CodeMirror component; marks follow on the next frame.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const v = editors.output
      if (v) v.dispatch({ effects: setMarks.of(result?.ok ? outputMarks(result.diagnostics) : []) })
    })
    return () => cancelAnimationFrame(id)
  }, [result])

  useEffect(() => {
    const d = selected && result?.diagnostics[selected.index]
    if (d?.outputSpan) reveal(editors.output, d.outputSpan.start, d.outputSpan.end)
  }, [selected, result])

  const guesses = result ? countBySeverity(result.diagnostics).guess : 0

  return (
    <section aria-label="Output" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 pr-2">
        <h2 className="pane-title">Output</h2>
        <fieldset className="segmented" aria-label="Output view">
          <button type="button" aria-pressed={view === 'code'} onClick={() => setView('code')}>
            Code
          </button>
          <button type="button" aria-pressed={view === 'tree'} onClick={() => setView('tree')}>
            Tree
          </button>
        </fieldset>
      </div>

      {result?.ok && guesses > 0 && (
        <p className="banner banner-guess" role="note">
          Output was reconstructed: verify the {guesses} guessed part{guesses === 1 ? '' : 's'}{' '}
          (highlighted in orange).
        </p>
      )}
      {result && !result.ok && (
        <div className="banner banner-error" role="alert">
          <strong>Could not produce valid JSON.</strong> {result.error?.message}
          {result.error?.position &&
            ` (line ${result.error.position.line}, column ${result.error.position.column})`}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {!result ? (
          <EmptyState />
        ) : view === 'tree' && result.ok ? (
          <TreeView output={output} jsonLines={result.jsonLines} />
        ) : (
          <CodeMirror
            value={output}
            height="100%"
            className="h-full"
            theme={dark ? 'dark' : 'light'}
            extensions={extensions}
            readOnly
            editable={false}
            onCreateEditor={(v) => {
              editors.output = v
            }}
            basicSetup={{ highlightActiveLine: false }}
          />
        )}
      </div>
    </section>
  )
}
