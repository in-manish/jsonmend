import { useState } from 'react'

const KEY = 'jsonmend:image-tip-seen'

const seen = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** A one-time hint for first-time users; dismissed for good with "Got it". */
export function FirstTip() {
  const [hidden, setHidden] = useState(seen)
  if (hidden) return null
  return (
    <div
      role="note"
      className="flex flex-none items-center gap-2 border-t border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xs text-[var(--muted)]"
    >
      <p className="min-w-0 flex-1">Tip: tap the photo to crop it.</p>
      <button
        type="button"
        className="flex-none px-2 py-1 font-medium text-[var(--accent)]"
        onClick={() => {
          setHidden(true)
          try {
            localStorage.setItem(KEY, '1')
          } catch {
            // Private mode: the tip just shows again next time.
          }
        }}
      >
        Got it
      </button>
    </div>
  )
}
