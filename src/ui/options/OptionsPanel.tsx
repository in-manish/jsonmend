import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { OptionField } from './OptionField'
import { OPTION_GROUPS } from './schema'

/** Side drawer with every option; changes apply (and persist) immediately. */
export function OptionsPanel() {
  const open = useAppStore((s) => s.optionsOpen)
  const setOpen = useAppStore((s) => s.setOptionsOpen)
  const reset = useAppStore((s) => s.resetOptions)
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLElement>('select, input, button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [open, setOpen])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-20 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close options"
        onClick={() => setOpen(false)}
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="options-title"
        className="relative h-full w-full max-w-sm overflow-auto border-l border-[var(--border)] bg-[var(--panel)] p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="options-title" className="text-base font-semibold">
            Options
          </h2>
          <button type="button" className="btn" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        {OPTION_GROUPS.map((group) => (
          <fieldset key={group.title} className="mb-4">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {group.title}
            </legend>
            <div className="flex flex-col gap-2">
              {group.fields.map((field) => (
                <OptionField key={field.key} field={field} />
              ))}
            </div>
          </fieldset>
        ))}
        <button type="button" className="btn" onClick={reset}>
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
