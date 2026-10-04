import { useRef } from 'react'
import type { Theme } from '../store/useAppStore'
import { useAppStore } from '../store/useAppStore'
import { copyText, download, pasteText, readTextFile } from './lib/files'
import { encodeShare, SHARE_LIMIT } from './lib/share'
import { OrientationSwitch } from './OrientationSwitch'
import { SAMPLES } from './samples'

const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }

export function Toolbar() {
  const s = useAppStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const output = s.result?.ok ? s.result.output : ''

  const copyOutput = async () => {
    if (!output) return
    s.notify((await copyText(output)) ? 'Copied output' : 'Clipboard is not available')
  }

  const share = async () => {
    const url = encodeShare(s.input)
    if (!url) return s.notify(`Share links are limited to ${SHARE_LIMIT / 1024} KB of input`)
    s.notify((await copyText(url)) ? 'Share link copied (the data is in the link itself)' : url)
  }

  return (
    <header className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 md:flex-wrap [&>*]:shrink-0">
      <h1 className="mr-2 font-semibold tracking-tight">jsonmend</h1>
      <button
        type="button"
        className="btn btn-primary inline-flex items-center gap-1.5"
        onClick={s.requestRun}
        title="Format (Ctrl/Cmd+Enter)"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
          <path d="M4 2.5v11a.5.5 0 0 0 .76.43l9-5.5a.5.5 0 0 0 0-.86l-9-5.5A.5.5 0 0 0 4 2.5Z" />
        </svg>
        {s.running ? 'Formatting...' : 'Format'}
      </button>
      <button
        type="button"
        className="btn"
        onClick={copyOutput}
        disabled={!output}
        title="Copy output (Ctrl/Cmd+Shift+C)"
      >
        Copy
      </button>
      <button
        type="button"
        className="btn"
        disabled={!output}
        onClick={() => download(output, s.result?.jsonLines ? 'output.jsonl' : 'output.json')}
      >
        Download
      </button>
      <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
        Upload
      </button>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        aria-label="Upload a file"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            s.setInput(await readTextFile(file))
            s.notify(`Loaded ${file.name}`)
          } catch (err) {
            s.notify((err as Error).message)
          }
        }}
      />
      <button
        type="button"
        className="btn"
        onClick={async () => {
          const text = await pasteText()
          if (text === undefined)
            s.notify('Clipboard is not available; paste into the editor instead')
          else s.setInput(text)
        }}
      >
        Paste
      </button>
      <button type="button" className="btn" onClick={() => s.setInput('')} disabled={!s.input}>
        Clear
      </button>
      <select
        className="btn"
        aria-label="Load a sample"
        value=""
        onChange={(e) => {
          const sample = SAMPLES.find((x) => x.id === e.target.value)
          if (sample) s.setInput(sample.text)
        }}
      >
        <option value="">Samples...</option>
        {SAMPLES.map((x) => (
          <option key={x.id} value={x.id}>
            {x.label}
          </option>
        ))}
      </select>
      <span className="flex-1" />
      <button
        type="button"
        className="btn"
        onClick={share}
        disabled={!s.input}
        title="Copy a link that contains the input"
      >
        Share
      </button>
      <OrientationSwitch />
      <button
        type="button"
        className="btn"
        onClick={() => s.setTheme(NEXT_THEME[s.theme])}
        aria-label={`Theme: ${s.theme}`}
      >
        Theme: {s.theme}
      </button>
      <button
        type="button"
        className="btn"
        aria-expanded={s.optionsOpen}
        onClick={() => s.setOptionsOpen(true)}
      >
        Options
      </button>
    </header>
  )
}
