import { html } from '@codemirror/lang-html'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { applyEdits, type Edit, formatHtml, type HtmlIssue } from '../../core/html/format'
import { useAppStore } from '../../store/useAppStore'
import { Announcer } from '../Announcer'
import { CopyAllButton } from '../CopyAllButton'
import { marksField, setMarks } from '../editor/marks'
import { baseTheme } from '../editor/theme'
import { reveal } from '../editor/views'
import { useTheme } from '../hooks/useTheme'
import { copyText, download, pasteText } from '../lib/files'
import { HtmlToolbar } from './HtmlToolbar'
import { IssueList } from './IssueList'
import { FoldButton, MaximizeButton, Rail } from './PaneControls'
import { PreviewPane } from './preview/PreviewPane'
import { useHtmlFile } from './useHtmlFile'
import { type HtmlView, useHtmlStore } from './useHtmlStore'

const outputExtensions = [
  html(),
  baseTheme,
  EditorView.contentAttributes.of({ 'aria-label': 'Formatted HTML (editable)' }),
]
const inputExtensions = [
  html(),
  marksField,
  baseTheme,
  EditorView.contentAttributes.of({ 'aria-label': 'Input: paste HTML here' }),
  // Dropped files replace the input (handled by the pane), instead of being typed in at the cursor.
  EditorView.domEventHandlers({ drop: (e) => (e.dataTransfer?.files.length ?? 0) > 0 }),
]
const VIEWS: { id: HtmlView; label: string }[] = [
  { id: 'code', label: 'Formatted' },
  { id: 'preview', label: 'Preview' },
]

export function HtmlTool() {
  const dark = useTheme()
  const { input, options, view, collapsed, maximized } = useHtmlStore()
  const { setInput, setOptions, setView, toggleCollapsed, setMaximized } = useHtmlStore.getState()
  const notify = useAppStore((s) => s.notify)
  const inputView = useRef<EditorView>(undefined)
  const outputView = useRef<EditorView>(undefined)
  const deferred = useDeferredValue(input)
  const result = useMemo(() => formatHtml(deferred, options), [deferred, options])
  // Edits typed into the formatted pane; reset whenever a new result arrives.
  const [edited, setEdited] = useState<string>()
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on every new result
  useEffect(() => setEdited(undefined), [result])
  const shown = edited ?? result.output
  // The formatted pane's text including edits (the editor is not mounted in preview).
  const current = () =>
    (view === 'code' ? outputView.current?.state.doc.toString() : undefined) ?? shown
  const empty = result.output === ''

  // Highlight each issue's span in the input once the editor shows the current text.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      inputView.current?.dispatch({
        effects: setMarks.of(
          result.issues.map((i) => ({
            from: i.from,
            to: i.to,
            severity: i.severity,
            message: i.suggestion ? `${i.message}. ${i.suggestion}` : i.message,
          })),
        ),
      })
    })
    return () => cancelAnimationFrame(id)
  }, [result])

  // Esc leaves the maximized view.
  useEffect(() => {
    if (!maximized) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMaximized(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [maximized, setMaximized])

  const apply = (fixes: Edit[]) => {
    setInput(applyEdits(input, fixes))
    notify(`Applied ${fixes.length} fix${fixes.length === 1 ? '' : 'es'} to the input`)
  }
  const file = useHtmlFile(setInput)
  const paste = async () => {
    const text = await pasteText()
    if (text === undefined) return notify('Clipboard is not available')
    setInput(text)
  }
  const copy = async () =>
    notify((await copyText(current())) ? 'Copied formatted HTML' : 'Clipboard is not available')
  const showIssue = (i: HtmlIssue) => reveal(inputView.current, i.from, i.to || i.from, true)

  const inputFolded = collapsed === 'input'
  const outputFolded = collapsed === 'output'

  return (
    <div className="flex h-full flex-col">
      <div className={maximized ? 'hidden' : 'contents'}>
        <HtmlToolbar
          options={options}
          hasInput={input !== ''}
          hasOutput={!empty}
          onOptions={setOptions}
          onOpen={file.open}
          onPaste={paste}
          onClear={() => {
            setInput('')
            file.forget()
          }}
          onUseFormatted={() => setInput(current())}
          onCopy={copy}
          onDownload={() => download(current(), file.downloadName, 'text/html')}
          onSample={setInput}
        />
      </div>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          className={`flex min-h-0 min-w-0 ${maximized ? 'hidden' : inputFolded ? 'flex-none' : 'flex-1'}`}
        >
          {inputFolded && <Rail pane="input" onClick={() => toggleCollapsed('input')} />}
          <section
            aria-label="HTML input"
            className={`min-h-0 min-w-0 flex-1 flex-col ${inputFolded ? 'hidden' : 'flex'} ${
              file.dragging
                ? 'outline-2 -outline-offset-2 outline-dashed outline-[var(--accent)]'
                : ''
            }`}
            {...file.dropProps}
          >
            <div className="flex items-center justify-between pr-2">
              <h2 className="pane-title truncate" title={file.fileName}>
                Input{file.fileName ? ` · ${file.fileName}` : ''}
              </h2>
              <div className="flex items-center gap-1">
                <CopyAllButton label="Copy all input" getText={() => input} />
                <FoldButton pane="input" onClick={() => toggleCollapsed('input')} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <CodeMirror
                value={input}
                height="100%"
                className="h-full"
                theme={dark ? 'dark' : 'light'}
                extensions={inputExtensions}
                onChange={setInput}
                placeholder="Paste HTML or a Django / Jinja template, or open / drop a .html file..."
                onCreateEditor={(v) => {
                  inputView.current = v
                }}
                basicSetup={{ highlightActiveLine: false, autocompletion: false }}
              />
            </div>
          </section>
        </div>
        <div
          className={`flex min-h-0 min-w-0 border-t border-[var(--border)] md:border-t-0 md:border-l ${outputFolded && !maximized ? 'flex-none' : 'flex-1'}`}
        >
          {outputFolded && !maximized && (
            <Rail pane="output" onClick={() => toggleCollapsed('output')} />
          )}
          <section
            aria-label="HTML output"
            className={`min-h-0 min-w-0 flex-1 flex-col ${outputFolded && !maximized ? 'hidden' : 'flex'}`}
          >
            <div className="flex items-center justify-between pr-2">
              <fieldset aria-label="Output view" className="m-0 flex border-0 p-0">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="pane-title cursor-pointer"
                    aria-pressed={view === v.id}
                    style={view === v.id ? undefined : { opacity: 0.55 }}
                    onClick={() => setView(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </fieldset>
              <div className="flex items-center gap-1">
                <CopyAllButton label="Copy all output" getText={current} />
                <MaximizeButton on={maximized} onClick={() => setMaximized(!maximized)} />
                {!maximized && (
                  <FoldButton pane="output" onClick={() => toggleCollapsed('output')} />
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {view === 'preview' ? (
                <PreviewPane html={shown} />
              ) : (
                <CodeMirror
                  value={result.output}
                  height="100%"
                  className="h-full"
                  theme={dark ? 'dark' : 'light'}
                  extensions={outputExtensions}
                  onChange={setEdited}
                  onCreateEditor={(v) => {
                    outputView.current = v
                  }}
                  basicSetup={{ highlightActiveLine: false, autocompletion: false }}
                />
              )}
            </div>
          </section>
        </div>
      </main>

      <div className={maximized ? 'hidden' : 'contents'}>
        <IssueList
          issues={result.issues}
          hasInput={input !== ''}
          onReveal={showIssue}
          onApply={apply}
        />
        <footer className="border-t border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)]">
          Only whitespace changes; content is verified unchanged. Preview runs no scripts and loads
          nothing from the network, and shows template tags as written.
        </footer>
      </div>
      <Announcer />
    </div>
  )
}
