import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { copyText } from './lib/files'

/** Icon button in a pane header that copies the pane's whole text (including unsaved edits). */
export function CopyAllButton({ label, getText }: { label: string; getText: () => string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onClick = async () => {
    const text = getText()
    if (!text) return useAppStore.getState().notify('Nothing to copy')
    setState((await copyText(text)) ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1200)
  }

  return (
    <button
      type="button"
      className="copy-all"
      data-state={state}
      onClick={onClick}
      title={state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      aria-label={label}
    >
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="5" y="5" width="8" height="9" rx="1.5" />
        <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" />
      </svg>
    </button>
  )
}
