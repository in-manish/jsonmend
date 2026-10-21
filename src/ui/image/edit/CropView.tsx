import { useState } from 'react'
import {
  CROP_PRESETS,
  clampRect,
  fitAspect,
  fullRect,
  presetAspect,
  type Rect,
} from '../../../core/image/crop'
import { NumField } from '../NumField'
import { CropOverlay } from './CropOverlay'

interface Props {
  src: string | undefined
  /** Natural size of the full image. */
  width: number
  height: number
  /** The crop already applied, if any: editing starts from it. */
  applied: Rect | undefined
  onApply(rect: Rect | undefined): void
  onCancel(): void
  /** Phones: start from the whole picture, keep the bar short, numbers behind a toggle. */
  compact?: boolean
}

/** Crop mode: the image with its overlay, aspect presets, exact numbers, and Apply / Cancel. */
export function CropView({ src, width, height, applied, onApply, onCancel, compact }: Props) {
  const bounds = { width, height }
  const [rect, setRect] = useState<Rect | undefined>(
    applied ?? (compact ? fullRect({ width, height }) : undefined),
  )
  const [exact, setExact] = useState(!compact)
  const [preset, setPreset] = useState('free')
  const aspect = presetAspect(preset, bounds)

  const choose = (id: string) => {
    setPreset(id)
    const a = presetAspect(id, bounds)
    if (rect && a) setRect(fitAspect(rect, a, bounds))
  }
  const field = (key: keyof Rect, max: number) => (
    <NumField
      label={key === 'w' ? 'Width' : key === 'h' ? 'Height' : key.toUpperCase()}
      value={rect ? rect[key] : 0}
      min={key === 'x' || key === 'y' ? 0 : 8}
      max={max}
      disabled={!rect}
      onCommit={(v) => rect && setRect(clampRect({ ...rect, [key]: v }, bounds))}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {src && (
        <CropOverlay
          src={src}
          width={width}
          height={height}
          rect={rect}
          aspect={aspect}
          onChange={setRect}
        />
      )}
      <section
        aria-label="Crop controls"
        className="flex flex-none flex-col gap-2 border-t border-[var(--border)] bg-[var(--panel)] p-2"
      >
        <p className="text-xs text-[var(--muted)]" role="status">
          {rect
            ? `Keeping ${rect.w}×${rect.h} px of ${width}×${height}.${compact ? ' Drag the corners to choose what to keep.' : ' Drag inside to move, drag a handle to resize.'}`
            : 'Tap the image for a starting box, or press and drag to draw one.'}
        </p>
        <div
          className="flex gap-1 overflow-x-auto [&>*]:shrink-0"
          role="tablist"
          aria-label="Crop shape"
        >
          {CROP_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={preset === p.id}
              className={compact ? 'btn crop-chip' : 'btn'}
              onClick={() => choose(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {compact && (
          <button
            type="button"
            className="self-start text-sm text-[var(--accent)]"
            aria-expanded={exact}
            onClick={() => setExact(!exact)}
          >
            {exact ? 'Hide exact size' : 'Exact size…'}
          </button>
        )}
        {exact && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {field('x', width)}
            {field('y', height)}
            {field('w', width)}
            {field('h', height)}
          </div>
        )}
        {compact ? (
          <div className="flex items-center gap-2">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={() => setRect(fullRect(bounds))}>
              Whole photo
            </button>
            {applied && (
              <button type="button" className="btn" onClick={() => onApply(undefined)}>
                Remove crop
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary ml-auto px-5"
              disabled={!rect}
              onClick={() => onApply(rect)}
            >
              Apply crop
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!rect}
              onClick={() => onApply(rect)}
            >
              Apply crop
            </button>
            <button type="button" className="btn" onClick={() => setRect(fullRect(bounds))}>
              Whole photo
            </button>
            <button
              type="button"
              className="btn"
              disabled={!applied}
              onClick={() => onApply(undefined)}
            >
              Remove crop
            </button>
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
