import { type PointerEvent, useRef } from 'react'

/** Drag handle between the panes (desktop only); reports the left pane width in percent. */
export function Splitter({ onResize }: { onResize(percent: number): void }) {
  const dragging = useRef(false)
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const parent = e.currentTarget.parentElement?.getBoundingClientRect()
    if (!parent) return
    onResize(Math.min(80, Math.max(20, ((e.clientX - parent.left) / parent.width) * 100)))
  }
  return (
    <div
      className="hidden w-1.5 cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)] md:block"
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
