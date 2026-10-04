import { useAppStore } from '../store/useAppStore'
import { SAMPLES } from './samples'

export function EmptyState() {
  const setInput = useAppStore((s) => s.setInput)
  return (
    <div className="flex h-full flex-col items-start gap-3 overflow-auto p-4 text-sm">
      <p className="text-[var(--muted)]">
        Paste anything that looks like data. You get valid JSON back, plus a report of every change.
        Nothing leaves your browser.
      </p>
      <p className="font-medium">Try a sample:</p>
      <ul className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <li key={s.id}>
            <button type="button" className="chip" onClick={() => setInput(s.text)}>
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
