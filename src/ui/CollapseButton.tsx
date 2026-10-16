import { type Pane, useAppStore } from '../store/useAppStore'

type Dir = 'left' | 'right' | 'up' | 'down'
const ROTATE: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 }

/** Where a pane folds to: input goes left (or up), output goes right (or down). */
export function collapseDirection(pane: Pane, horizontal: boolean): Dir {
  if (horizontal) return pane === 'input' ? 'left' : 'right'
  return pane === 'input' ? 'up' : 'down'
}

const OPPOSITE: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' }

export function Chevron({ dir }: { dir: Dir }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      style={{ transform: `rotate(${ROTATE[dir]}deg)` }}
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

/** Header button that folds a pane away; the rail it leaves behind has the matching expand button. */
export function CollapseButton({ pane }: { pane: Pane }) {
  const horizontal = useAppStore((s) => s.orientation) === 'horizontal'
  const toggle = useAppStore((s) => s.toggleCollapsed)
  const dir = collapseDirection(pane, horizontal)
  const label = `Collapse ${pane} (${dir})`
  return (
    <button
      type="button"
      className="copy-all"
      onClick={() => toggle(pane)}
      title={label}
      aria-label={label}
    >
      <Chevron dir={dir} />
    </button>
  )
}

/** Slim strip shown in place of a collapsed pane. */
export function CollapsedRail({ pane }: { pane: Pane }) {
  const horizontal = useAppStore((s) => s.orientation) === 'horizontal'
  const toggle = useAppStore((s) => s.toggleCollapsed)
  const dir = OPPOSITE[collapseDirection(pane, horizontal)]
  const label = `Expand ${pane}`
  return (
    <button
      type="button"
      className={`collapsed-rail ${horizontal ? 'collapsed-rail-col' : ''}`}
      onClick={() => toggle(pane)}
      title={label}
      aria-label={label}
    >
      <Chevron dir={dir} />
      <span className="pane-title !p-0">{pane}</span>
    </button>
  )
}
