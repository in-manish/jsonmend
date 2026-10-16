import { python } from '@codemirror/lang-python'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useMemo, useRef } from 'react'
import { fixPythonIndentation, type PyIssue, terminalCommand } from '../../core/pyindent/fix'
import { useAppStore } from '../../store/useAppStore'
import { Announcer } from '../Announcer'
import { CopyAllButton } from '../CopyAllButton'
import { marksField, setMarks } from '../editor/marks'
import { baseTheme } from '../editor/theme'
import { reveal } from '../editor/views'
import { useTheme } from '../hooks/useTheme'
import { copyText, download, pasteText } from '../lib/files'
import { PY_SAMPLES } from './samples'
import { usePyStore } from './usePyStore'

const SEVERITY_LABEL = {
  info: 'fixed',
  warn: 'fixed',
  guess: 'guessed',
  error: 'needs you',
} as const
const SEVERITY_COLOR = {
  info: 'var(--info)',
  warn: 'var(--warn)',
  guess: 'var(--guess)',
  error: 'var(--error)',
} as const

const outputExtensions = [
  python(),
  baseTheme,
  EditorView.contentAttributes.of({ 'aria-label': 'Corrected Python code (editable)' }),
]
const inputExtensions = [
  python(),
  marksField,
  baseTheme,
  EditorView.contentAttributes.of({ 'aria-label': 'Input: paste Python code here' }),
]

export function PyIndentTool() {
  const dark = useTheme()
  const { input, options, setInput, setOptions } = usePyStore()
  const notify = useAppStore((s) => s.notify)
  const inputView = useRef<EditorView>(undefined)
  const outputView = useRef<EditorView>(undefined)
  const result = useMemo(() => fixPythonIndentation(input, options), [input, options])
  const needAttention = result.issues.filter(
    (i) => i.severity === 'error' || i.severity === 'guess',
  )

  // Highlight the offending whitespace in the input once the editor shows the current text.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      inputView.current?.dispatch({
        effects: setMarks.of(
          result.issues.map((i) => ({
            from: i.from,
            to: i.to,
            severity: i.severity,
            message: i.message,
          })),
        ),
      })
    })
    return () => cancelAnimationFrame(id)
  }, [result])

  const paste = async () => {
    const text = await pasteText()
    if (text === undefined) return notify('Clipboard is not available')
    setInput(text)
  }
  const copyCommand = async () =>
    notify(
      (await copyText(terminalCommand(current())))
        ? 'Terminal command copied: paste it into bash or zsh'
        : 'Clipboard is not available',
    )
  const empty = result.output === ''
  // The corrected code including any edits made in the output pane.
  const current = () => outputView.current?.state.doc.toString() ?? result.output

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 md:flex-wrap [&>*]:shrink-0">
        <label className="flex items-center gap-1 text-sm">
          Indent
          <select
            className="input-sm"
            value={options.indentSize}
            onChange={(e) => setOptions({ indentSize: Number(e.target.value) })}
          >
            {[2, 4, 8].map((n) => (
              <option key={n} value={n}>
                {n} spaces
              </option>
            ))}
          </select>
        </label>
        <label
          className="flex items-center gap-1 text-sm"
          title="How many columns a tab counts as when reading your code"
        >
          Tab =
          <select
            className="input-sm"
            value={options.tabWidth}
            onChange={(e) => setOptions({ tabWidth: Number(e.target.value) })}
          >
            {[2, 4, 8].map((n) => (
              <option key={n} value={n}>
                {n} spaces
              </option>
            ))}
          </select>
        </label>
        <label
          className="flex items-center gap-1 text-sm"
          title="If the first line is indented (a method pasted out of a class), shift everything to column 0"
        >
          <input
            type="checkbox"
            checked={options.dedentSnippet}
            onChange={(e) => setOptions({ dedentSnippet: e.target.checked })}
          />
          Dedent snippet
        </label>
        <button type="button" className="btn" onClick={paste}>
          Paste
        </button>
        <button type="button" className="btn" disabled={!input} onClick={() => setInput('')}>
          Clear
        </button>
        <button
          type="button"
          className="btn"
          disabled={empty}
          onClick={() => setInput(current())}
          title="Replace the input with the corrected code"
        >
          Use fixed code as input
        </button>
        <button
          type="button"
          className="btn"
          disabled={empty}
          onClick={async () =>
            notify(
              (await copyText(current())) ? 'Copied corrected code' : 'Clipboard is not available',
            )
          }
        >
          Copy
        </button>
        <button
          type="button"
          className="btn"
          disabled={empty}
          onClick={() => download(current(), 'fixed.py', 'text/x-python')}
        >
          Download .py
        </button>
        <button
          type="button"
          className="btn"
          disabled={empty}
          onClick={copyCommand}
          title={'Copies python3 -c "$(cat <<\'PY\' ... PY)" so it runs straight from bash or zsh'}
        >
          Copy terminal command
        </button>
        <select
          className="input-sm"
          aria-label="Samples"
          value=""
          onChange={(e) => {
            const sample = PY_SAMPLES.find((x) => x.id === e.target.value)
            if (sample) setInput(sample.text)
          }}
        >
          <option value="">Samples...</option>
          {PY_SAMPLES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
      </header>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section aria-label="Python input" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between pr-2">
            <h2 className="pane-title">Input</h2>
            <CopyAllButton label="Copy all input" getText={() => input} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <CodeMirror
              value={input}
              height="100%"
              className="h-full"
              theme={dark ? 'dark' : 'light'}
              extensions={inputExtensions}
              onChange={setInput}
              placeholder="Paste Python code here..."
              onCreateEditor={(v) => {
                inputView.current = v
              }}
              basicSetup={{
                highlightActiveLine: false,
                autocompletion: false,
                indentOnInput: false,
              }}
            />
          </div>
        </section>
        <section
          aria-label="Python output"
          className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-[var(--border)] md:border-t-0 md:border-l"
        >
          <div className="flex items-center justify-between pr-2">
            <h2 className="pane-title">Corrected</h2>
            <CopyAllButton label="Copy all output" getText={current} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <CodeMirror
              value={result.output}
              height="100%"
              className="h-full"
              theme={dark ? 'dark' : 'light'}
              extensions={outputExtensions}
              onCreateEditor={(v) => {
                outputView.current = v
              }}
              basicSetup={{ highlightActiveLine: false, autocompletion: false }}
            />
          </div>
        </section>
      </main>

      <section
        aria-label="Indentation issues"
        className="max-h-[35%] overflow-auto border-t border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
      >
        <h2 className="pane-title !px-0">
          {empty
            ? 'Paste Python code to check its indentation'
            : result.issues.length === 0
              ? 'Indentation looks good: nothing to fix'
              : `${result.issues.length} issue${result.issues.length === 1 ? '' : 's'}, ${result.changedLines} line${result.changedLines === 1 ? '' : 's'} re-indented${needAttention.length ? `, ${needAttention.length} to check` : ''}`}
        </h2>
        <ul className="flex flex-col gap-0.5">
          {result.issues.map((i: PyIssue, k) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: issues have no stable id
            <li key={k}>
              <button
                type="button"
                className="flex w-full items-baseline gap-2 text-left hover:bg-[var(--bg)]"
                onClick={() => reveal(inputView.current, i.from, i.to || i.from, true)}
              >
                <span className="w-14 shrink-0 tabular-nums text-[var(--muted)]">
                  Line {i.line}
                </span>
                <span
                  className="w-16 shrink-0 text-xs font-semibold uppercase"
                  style={{ color: SEVERITY_COLOR[i.severity] }}
                >
                  {SEVERITY_LABEL[i.severity]}
                </span>
                <span>{i.message}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <footer className="border-t border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)]">
        Fixes indentation only (tabs, mixed, wrong size). It does not check Python syntax, so run
        the result to confirm.
      </footer>
      <Announcer />
    </div>
  )
}
