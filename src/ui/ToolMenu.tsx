import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { pathFor } from '../routes'
import type { Tool } from '../store/useAppStore'

interface Props {
  tools: { id: Tool; label: string }[]
  current: Tool
  onPick(e: MouseEvent<HTMLAnchorElement>, tool: Tool): void
}

/**
 * Phone header: the app name and a button naming the current tool, which opens the list of tools.
 * Replaces the tab strip, whose five labels do not fit a phone.
 */
export function ToolMenu({ tools, current, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const label = tools.find((t) => t.id === current)?.label ?? ''
  return (
    <div
      ref={root}
      className="relative flex h-12 items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3 md:hidden"
    >
      <span className="font-semibold">jsonmend</span>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Tool: ${label}. Change tool`}
        onClick={() => setOpen(!open)}
        className="ml-auto flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3.5 text-sm font-medium"
      >
        {label}
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d={open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} />
        </svg>
      </button>
      {open && (
        <nav
          aria-label="Tools"
          className="absolute top-full right-2 z-50 mt-1 flex w-64 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] py-1 shadow-lg"
        >
          {tools.map((t) => (
            <a
              key={t.id}
              href={pathFor(t.id, import.meta.env.BASE_URL)}
              aria-current={current === t.id ? 'page' : undefined}
              className={`flex min-h-12 items-center px-4 text-[15px] ${
                current === t.id ? 'font-semibold text-[var(--accent)]' : ''
              } active:bg-[var(--bg)]`}
              onClick={(e) => {
                setOpen(false)
                onPick(e, t.id)
              }}
            >
              {t.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  )
}
