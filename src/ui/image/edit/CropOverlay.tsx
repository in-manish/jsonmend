import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import {
  defaultRect,
  dragNewRect,
  type Handle,
  moveRect,
  type Point,
  type Rect,
  resizeRect,
} from '../../../core/image/crop'

const HANDLES: { id: Handle; x: 0 | 0.5 | 1; y: 0 | 0.5 | 1; cursor: string }[] = [
  { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
]

/** A pointer must travel this far (screen pixels) before a press counts as a drag, not a tap. */
const DRAG_SLOP = 5

type Drag =
  | { kind: 'new'; start: Point; moved: boolean }
  | { kind: 'move'; start: Point; rect: Rect }
  | { kind: 'resize'; handle: Handle; start: Point; rect: Rect }

interface Props {
  src: string
  /** Natural size of the image in pixels. */
  width: number
  height: number
  rect: Rect | undefined
  /** Width / height to keep, or undefined for free-form. */
  aspect: number | undefined
  onChange(rect: Rect | undefined): void
}

/**
 * The image with a draggable crop rectangle. Press and drag anywhere to draw one, tap to get a
 * starting rectangle, drag inside to move it, drag a handle to resize. Works with touch and mouse.
 */
export function CropOverlay({ src, width, height, rect, aspect, onChange }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [scale, setScale] = useState(0)
  const bounds = { width, height }

  // Largest scale at which the whole image fits the available space.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const update = () =>
      setScale(Math.min(6, (el.clientWidth - 24) / width, (el.clientHeight - 24) / height))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, height])

  const toImage = (e: ReactPointerEvent): Point => {
    const b = (frame.current as HTMLDivElement).getBoundingClientRect()
    return {
      x: Math.min(width, Math.max(0, (e.clientX - b.left) / scale)),
      y: Math.min(height, Math.max(0, (e.clientY - b.top) / scale)),
    }
  }

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toImage(e)
    const handle = (e.target as HTMLElement).dataset.handle as Handle | undefined
    if (handle && rect) drag.current = { kind: 'resize', handle, start: p, rect }
    else if (
      rect &&
      p.x >= rect.x &&
      p.x <= rect.x + rect.w &&
      p.y >= rect.y &&
      p.y <= rect.y + rect.h
    ) {
      drag.current = { kind: 'move', start: p, rect }
    } else drag.current = { kind: 'new', start: p, moved: false }
  }

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const p = toImage(e)
    const dx = p.x - d.start.x
    const dy = p.y - d.start.y
    if (d.kind === 'resize') onChange(resizeRect(d.rect, d.handle, dx, dy, bounds, aspect))
    else if (d.kind === 'move') onChange(moveRect(d.rect, dx, dy, bounds))
    else {
      if (!d.moved && Math.hypot(dx, dy) * scale < DRAG_SLOP) return
      d.moved = true
      onChange(dragNewRect(d.start, p, bounds, aspect))
    }
  }

  const onUp = () => {
    const d = drag.current
    drag.current = null
    // A tap without dragging starts from a centered rectangle.
    if (d?.kind === 'new' && !d.moved) onChange(defaultRect(bounds, aspect))
  }

  const w = width * scale
  const h = height * scale
  return (
    <div
      ref={box}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/80"
    >
      {scale > 0 && (
        <div
          ref={frame}
          data-testid="crop-frame"
          title="Drag to select the part to keep"
          className="relative flex-none touch-none select-none overflow-hidden"
          style={{ width: w, height: h, cursor: 'crosshair' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <img src={src} alt="Crop preview" draggable={false} className="block h-full w-full" />
          {rect && (
            <div
              data-testid="crop-rect"
              className="absolute border-2 border-white"
              style={{
                left: rect.x * scale,
                top: rect.y * scale,
                width: rect.w * scale,
                height: rect.h * scale,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                cursor: 'move',
                backgroundImage:
                  'linear-gradient(to right, transparent 33%, rgba(255,255,255,.45) 33%, rgba(255,255,255,.45) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.45) 66%, rgba(255,255,255,.45) calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, rgba(255,255,255,.45) 33%, rgba(255,255,255,.45) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgba(255,255,255,.45) 66%, rgba(255,255,255,.45) calc(66% + 1px), transparent calc(66% + 1px))',
              }}
            >
              {HANDLES.map((hd) => (
                <span
                  key={hd.id}
                  data-handle={hd.id}
                  data-testid={`crop-handle-${hd.id}`}
                  className="absolute flex h-9 w-9 items-center justify-center"
                  style={{
                    left: `${hd.x * 100}%`,
                    top: `${hd.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: hd.cursor,
                  }}
                >
                  <span className="pointer-events-none h-3.5 w-3.5 rounded-full border-2 border-black/60 bg-white" />
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
