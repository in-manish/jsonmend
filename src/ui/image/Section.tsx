import { type ReactNode, useState } from 'react'

const wide = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

interface Props {
  title: string
  /** One-line state shown when collapsed (e.g. "1200×800 px"). */
  summary?: string
  /** Open on phones too; other sections start open only on wide screens. */
  openOnPhone?: boolean
  children: ReactNode
}

/** A collapsible group of controls with a big tap target; keeps phone screens short. */
export function Section({ title, summary, openOnPhone, children }: Props) {
  const [open, setOpen] = useState(() => !!openOnPhone || wide())
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center gap-2 px-3 text-left"
      >
        <span className="pane-title !p-0 flex-none">{title}</span>
        <span className="min-w-0 flex-1 truncate text-right text-xs text-[var(--muted)]">
          {open ? '' : summary}
        </span>
        <span aria-hidden="true" className="text-[var(--muted)]">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] p-3">{children}</div>
      )}
    </section>
  )
}
