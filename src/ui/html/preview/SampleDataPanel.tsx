interface Props {
  /** Data inferred from the template. */
  generated: Record<string, unknown>
  /** The user's edited JSON, if any. */
  text: string | undefined
  error: string | undefined
  notes: string[]
  onChange(text: string | undefined): void
}

/** Editable JSON the template is rendered with, plus what could not be simulated. */
export function SampleDataPanel({ generated, text, error, notes, onChange }: Props) {
  const value = text ?? JSON.stringify(generated, null, 2)
  return (
    <details open className="border-t border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm">
      <summary className="pane-title cursor-pointer !px-0">
        Sample data (JSON){text !== undefined ? ' · edited' : ''}
        {notes.length > 0 && (
          <span className="ml-2 font-normal text-[var(--warn)]">
            {notes.length} note{notes.length === 1 ? '' : 's'}
          </span>
        )}
      </summary>
      <div className="flex gap-2">
        <textarea
          aria-label="Sample data (JSON)"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-32 min-w-0 flex-1 resize-y rounded border border-[var(--border)] bg-[var(--bg)] p-2 font-mono text-xs"
        />
        <div className="flex w-56 flex-none flex-col gap-1">
          <button
            type="button"
            className="btn"
            disabled={text === undefined}
            onClick={() => onChange(undefined)}
            title="Discard edits and regenerate the data from the template"
          >
            Reset to generated
          </button>
          {error && (
            <p className="text-xs text-[var(--error)]">
              Invalid JSON: {error}. Using generated data.
            </p>
          )}
          <ul
            aria-label="Render notes"
            className="max-h-24 overflow-auto text-xs text-[var(--muted)]"
          >
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  )
}
