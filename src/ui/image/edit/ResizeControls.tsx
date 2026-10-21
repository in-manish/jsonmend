import { useState } from 'react'
import {
  type Dim,
  fromPercent,
  linkedHeight,
  linkedWidth,
  MAX_EDGE,
} from '../../../core/image/dims'
import { NumField } from '../NumField'

const WIDTHS = [3840, 1920, 1280, 1024, 800, 640, 320]

interface Props {
  original: Dim
  dims: Dim
  lock: boolean
  onDims(d: Dim): void
  onLock(lock: boolean): void
}

export function ResizeControls({ original, dims, lock, onDims, onLock }: Props) {
  const [unit, setUnit] = useState<'px' | 'percent'>('px')
  const percent = Math.round((dims.width / original.width) * 1000) / 10
  const changed = dims.width !== original.width || dims.height !== original.height

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="pane-title !px-0">Resize</legend>
      <div className="flex gap-1">
        {(['px', 'percent'] as const).map((u) => (
          <button
            key={u}
            type="button"
            className="btn"
            aria-pressed={unit === u}
            style={unit === u ? { borderColor: 'var(--accent)' } : undefined}
            onClick={() => setUnit(u)}
          >
            {u === 'px' ? 'Pixels' : 'Percent'}
          </button>
        ))}
      </div>
      {unit === 'px' ? (
        <>
          <NumField
            label="Width"
            value={dims.width}
            max={MAX_EDGE}
            suffix="px"
            onCommit={(w) =>
              onDims({ width: w, height: lock ? linkedHeight(original, w) : dims.height })
            }
          />
          <NumField
            label="Height"
            value={dims.height}
            max={MAX_EDGE}
            suffix="px"
            onCommit={(h) =>
              onDims({ width: lock ? linkedWidth(original, h) : dims.width, height: h })
            }
          />
        </>
      ) : (
        <NumField
          label="Scale"
          value={percent}
          min={0.1}
          max={400}
          step={1}
          suffix="%"
          onCommit={(p) => onDims(fromPercent(original, p))}
        />
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={lock} onChange={(e) => onLock(e.target.checked)} />
        Keep aspect ratio
      </label>
      <fieldset className="m-0 flex flex-wrap gap-1 border-0 p-0" aria-label="Resize presets">
        {[25, 50, 75].map((p) => (
          <button
            key={p}
            type="button"
            className="btn"
            onClick={() => onDims(fromPercent(original, p))}
          >
            {p}%
          </button>
        ))}
        {WIDTHS.filter((w) => w < original.width).map((w) => (
          <button
            key={w}
            type="button"
            className="btn"
            onClick={() => onDims({ width: w, height: linkedHeight(original, w) })}
          >
            {w}px
          </button>
        ))}
        <button type="button" className="btn" disabled={!changed} onClick={() => onDims(original)}>
          Original
        </button>
      </fieldset>
      {(dims.width > original.width || dims.height > original.height) && (
        <p className="text-xs text-[var(--warn)]">
          Enlarging adds no detail and makes the file bigger.
        </p>
      )}
    </fieldset>
  )
}
