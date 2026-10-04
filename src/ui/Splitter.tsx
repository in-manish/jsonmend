import { type PointerEvent, useRef } from 'react'

/**
 * Drag handle between the panes (desktop only); reports the first pane's share in percent:
 * its width when the panes sit side by side, its height when stacked.
 */
export function Splitter({
  horizontal,
  onResize,
}: {
  horizontal: boolean
  onResize(percent: number): void
}) {
  const dragging = useRef(false)
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const parent = e.currentTarget.parentElement?.getBoundingClientRect()
    if (!parent) return
    const share = horizontal
      ? (e.clientX - parent.left) / parent.width
      : (e.clientY - parent.top) / parent.height
    onResize(Math.min(80, Math.max(20, share * 100)))
  }
  return (
    <div
      className={`hidden bg-[var(--border)] hover:bg-[var(--accent)] md:block ${
        horizontal ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      }`}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={move}
      onPointerUp={() => {
        dragging.current = false
      }}
    />
  )
}
