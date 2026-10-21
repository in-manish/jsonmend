import { useSyncExternalStore } from 'react'
import { Chevron } from '../CollapseButton'

export type HtmlPane = 'input' | 'output'
type Dir = 'left' | 'right' | 'up' | 'down'

const WIDE = '(min-width: 768px)'
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(WIDE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
/** Panes sit side by side from the `md` breakpoint up, stacked below it. */
export const useSideBySide = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => true,
  )

const OPPOSITE: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' }
/** Where a pane folds to: input goes left (or up), output goes right (or down). */
const foldDir = (pane: HtmlPane, wide: boolean): Dir =>
  wide ? (pane === 'input' ? 'left' : 'right') : pane === 'input' ? 'up' : 'down'

export function FoldButton({ pane, onClick }: { pane: HtmlPane; onClick(): void }) {
  const label = `Collapse ${pane} (${foldDir(pane, useSideBySide())})`
  return (
    <button type="button" className="copy-all" onClick={onClick} title={label} aria-label={label}>
      <Chevron dir={foldDir(pane, useSideBySide())} />
    </button>
  )
}

/** Slim strip shown in place of a collapsed pane. */
export function Rail({ pane, onClick }: { pane: HtmlPane; onClick(): void }) {
  const wide = useSideBySide()
  const label = `Expand ${pane}`
  return (
    <button
      type="button"
      className={`collapsed-rail ${wide ? 'collapsed-rail-col' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Chevron dir={OPPOSITE[foldDir(pane, wide)]} />
      <span className="pane-title !p-0">{pane}</span>
    </button>
  )
}

/** Fills the whole tool with the output pane (and back). */
export function MaximizeButton({ on, onClick }: { on: boolean; onClick(): void }) {
  const label = on ? 'Restore layout (Esc)' : 'Maximize output'
  return (
    <button
      type="button"
      className="copy-all"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={on}
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
        <path
          d={
            on ? 'M6 2v4H2M10 14v-4h4M14 6h-4V2M2 10h4v4' : 'M2 6V2h4M14 10v4h-4M10 2h4v4M6 14H2v-4'
          }
        />
      </svg>
    </button>
  )
}
