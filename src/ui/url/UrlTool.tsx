import { useMemo, useState } from 'react'
import { convert, MODES, parseUrl } from '../../core/url/codec'
import { useAppStore } from '../../store/useAppStore'
import { Announcer } from '../Announcer'
import { CopyAllButton } from '../CopyAllButton'
import { pasteText } from '../lib/files'
import { useUrlStore } from './useUrlStore'

const SAMPLES: { label: string; mode: 'component' | 'form' | 'base64url'; text: string }[] = [
  {
    label: 'Encoded link',
    mode: 'component',
    text: 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%2520world%26lang%3Den%23results',
  },
  { label: 'Form data', mode: 'form', text: 'name=Jane+Doe&city=S%C3%A3o+Paulo&tags=a%2Cb' },
  { label: 'Base64 URL-safe', mode: 'base64url', text: 'aHR0cHM6Ly9leGFtcGxlLmNvbS9hP3g9MSZ5PTI' },
]

export function UrlTool() {
  const s = useUrlStore()
  const notify = useAppStore((a) => a.notify)
  const result = useMemo(
    () => convert(s.direction, s.mode, s.input, s.repeat),
    [s.direction, s.mode, s.input, s.repeat],
  )
  const converted = result.ok ? result.output : ''
  // Edits to the result are kept until the conversion produces something new.
  const [edit, setEdit] = useState<{ base: string; text: string }>()
  const output = edit && edit.base === converted ? edit.text : converted
  const parts = useMemo(
    () => parseUrl(s.direction === 'decode' ? output : s.input),
    [s.direction, output, s.input],
  )
  const hint = MODES.find((m) => m.id === s.mode)?.hint

  const paste = async () => {
    const text = await pasteText()
    if (text === undefined) return notify('Clipboard is not available')
    s.setInput(text)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 md:flex-wrap [&>*]:shrink-0">
        <fieldset className="segmented" aria-label="Direction">
          <button
            type="button"
            aria-pressed={s.direction === 'decode'}
            onClick={() => s.setDirection('decode')}
          >
            Decode
          </button>
          <button
            type="button"
            aria-pressed={s.direction === 'encode'}
            onClick={() => s.setDirection('encode')}
          >
            Encode
          </button>
        </fieldset>
        <select
          className="input-sm"
          aria-label="Encoding type"
          title={hint}
          value={s.mode}
          onChange={(e) => s.setMode(e.target.value as typeof s.mode)}
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {s.direction === 'decode' && (
          <label
            className="flex items-center gap-1 text-sm"
            title="Keep decoding until the text stops changing (for double-encoded URLs)"
          >
            <input
              type="checkbox"
              checked={s.repeat}
              onChange={(e) => s.setRepeat(e.target.checked)}
            />
            Decode repeatedly
          </label>
        )}
        <button type="button" className="btn" onClick={paste}>
          Paste
        </button>
        <button type="button" className="btn" disabled={!result.ok || !s.input} onClick={s.swap}>
          Use output as input
        </button>
        <button type="button" className="btn" disabled={!s.input} onClick={() => s.setInput('')}>
          Clear
        </button>
        <select
          className="input-sm"
          aria-label="Samples"
          value=""
          onChange={(e) => {
            const sample = SAMPLES[Number(e.target.value)]
            if (!sample) return
            s.setDirection('decode')
            s.setMode(sample.mode)
            s.setInput(sample.text)
          }}
        >
          <option value="">Samples...</option>
          {SAMPLES.map((x, i) => (
            <option key={x.label} value={i}>
              {x.label}
            </option>
          ))}
        </select>
      </header>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section aria-label="URL input" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between pr-2">
            <h2 className="pane-title">{s.direction === 'decode' ? 'Encoded' : 'Plain text'}</h2>
            <CopyAllButton label="Copy all input" getText={() => s.input} />
          </div>
          <textarea
            className="url-text"
            aria-label={s.direction === 'decode' ? 'Encoded URL' : 'Text or URL to encode'}
            placeholder={
              s.direction === 'decode'
                ? 'Paste an encoded URL...'
                : 'Paste a URL or text to encode...'
            }
            spellCheck={false}
            value={s.input}
            onChange={(e) => s.setInput(e.target.value)}
          />
        </section>
        <section
          aria-label="URL output"
          className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-[var(--border)] md:border-t-0 md:border-l"
        >
          <div className="flex items-center justify-between pr-2">
            <h2 className="pane-title">{s.direction === 'decode' ? 'Decoded' : 'Encoded'}</h2>
            <CopyAllButton label="Copy all output" getText={() => output} />
          </div>
          {!result.ok && (
            <div className="banner banner-error" role="alert">
              {result.error}
            </div>
          )}
          <textarea
            className="url-text"
            aria-label="Result (editable)"
            onChange={(e) => setEdit({ base: converted, text: e.target.value })}
            spellCheck={false}
            value={output}
          />
        </section>
      </main>

      {parts && (
        <section
          aria-label="URL parts"
          className="max-h-[35%] overflow-auto border-t border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
        >
          <h2 className="pane-title !px-0">URL parts</h2>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 font-mono text-xs">
            {(
              [
                ['Protocol', parts.protocol],
                ['User', parts.username],
                ['Password', parts.password],
                ['Host', parts.host],
                ['Port', parts.port],
                ['Path', parts.path],
                ['Fragment', parts.hash],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[var(--muted)]">{k}</dt>
                  <dd className="break-all">{v}</dd>
                </div>
              ))}
            {parts.query.map((q, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: query keys can repeat
              <div key={i} className="contents">
                <dt className="text-[var(--muted)]">Query</dt>
                <dd className="break-all">
                  {q.key} = {q.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <footer className="border-t border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)]">
        {hint}
        {result.ok &&
          s.repeat &&
          s.direction === 'decode' &&
          ` · decoded in ${result.passes} pass${result.passes === 1 ? '' : 'es'}`}
      </footer>
      <Announcer />
    </div>
  )
}
