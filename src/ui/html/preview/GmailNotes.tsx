import type { GmailNote } from '../../../core/html/email/gmail'

const COLOR = { error: 'var(--error)', warn: 'var(--warn)', info: 'var(--info)' } as const

/** What Gmail changes or drops, so the preview is not mistaken for the source. */
export function GmailNotes({ notes, bytes }: { notes: GmailNote[]; bytes: number }) {
  return (
    <section
      aria-label="Gmail changes"
      className="max-h-40 overflow-auto border-t border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm"
    >
      <h3 className="pane-title !px-0">
        {notes.length === 0
          ? 'Gmail shows this as written'
          : `Gmail changes ${notes.length} thing${notes.length === 1 ? '' : 's'}`}
        <span className="ml-2 font-normal text-[var(--muted)]">{(bytes / 1024).toFixed(1)} KB</span>
      </h3>
      <ul className="flex flex-col gap-0.5">
        {notes.map((n) => (
          <li key={n.message} className="flex gap-2">
            <span
              className="w-12 shrink-0 text-xs font-semibold uppercase"
              style={{ color: COLOR[n.severity] }}
            >
              {n.severity === 'error' ? 'breaks' : 'changes'}
            </span>
            <span>{n.message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
