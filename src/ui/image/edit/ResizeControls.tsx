import {
  type Dim,
  fromPercent,
  linkedHeight,
  linkedWidth,
  MAX_EDGE,
  physicalToPx,
  pxToPhysical,
  scaleDim,
} from '../../../core/image/dims'
import { NumField } from '../NumField'
import type { ResizeUnit } from '../useImageStore'

const WIDTHS = [3840, 1920, 1280, 1024, 800, 640, 320]
const DPIS = [72, 96, 150, 300, 600]
const UNITS: { id: ResizeUnit; label: string }[] = [
  { id: 'px', label: 'Pixels' },
  { id: 'percent', label: '%' },
  { id: 'in', label: 'Inches' },
  { id: 'cm', label: 'cm' },
]

interface Props {
  /** The image being resized: the whole image, or the cropped region. */
  original: Dim
  dims: Dim
  lock: boolean
  unit: ResizeUnit
  dpi: number
  onDims(d: Dim): void
  onLock(lock: boolean): void
  onUnit(unit: ResizeUnit): void
  onDpi(dpi: number): void
}

/** Resize by pixels, percent, inches or centimetres (inches and cm use the print resolution). */
export function ResizeControls({
  original,
  dims,
  lock,
  unit,
  dpi,
  onDims,
  onLock,
  onUnit,
  onDpi,
}: Props) {
  const percent = Math.round((dims.width / original.width) * 1000) / 10
  const changed = dims.width !== original.width || dims.height !== original.height
  const physical = unit === 'in' || unit === 'cm'
  const inches = (px: number) => pxToPhysical(px, 'in', dpi)
  const cms = (px: number) => pxToPhysical(px, 'cm', dpi)

  const setWidth = (w: number) =>
    onDims({ width: w, height: lock ? linkedHeight(original, w) : dims.height })
  const setHeight = (h: number) =>
    onDims({ width: lock ? linkedWidth(original, h) : dims.width, height: h })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Resize units">
        {UNITS.map((u) => (
          <button
            key={u.id}
            type="button"
            role="tab"
            aria-selected={unit === u.id}
            className="btn"
            onClick={() => onUnit(u.id)}
          >
            {u.label}
          </button>
        ))}
      </div>

      {unit === 'percent' ? (
        <NumField
          label="Scale"
          value={percent}
          min={0.1}
          max={400}
          step={1}
          suffix="%"
          onCommit={(p) => onDims(fromPercent(original, p))}
        />
      ) : (
        <>
          <NumField
            label="Width"
            value={physical ? pxToPhysical(dims.width, unit, dpi) : dims.width}
            min={physical ? 0.01 : 1}
            max={physical ? pxToPhysical(MAX_EDGE, unit, dpi) : MAX_EDGE}
            step={physical ? 0.1 : 1}
            suffix={physical ? unit : 'px'}
            onCommit={(v) => setWidth(physical ? physicalToPx(v, unit, dpi) : v)}
          />
          <NumField
            label="Height"
            value={physical ? pxToPhysical(dims.height, unit, dpi) : dims.height}
            min={physical ? 0.01 : 1}
            max={physical ? pxToPhysical(MAX_EDGE, unit, dpi) : MAX_EDGE}
            step={physical ? 0.1 : 1}
            suffix={physical ? unit : 'px'}
            onCommit={(v) => setHeight(physical ? physicalToPx(v, unit, dpi) : v)}
          />
        </>
      )}

      <label className="flex items-center gap-2 text-sm" title="Print resolution">
        <span className="w-14 flex-none text-[var(--muted)]">Dpi</span>
        <select
          className="input-sm"
          aria-label="Print resolution"
          value={dpi}
          onChange={(e) => {
            const next = Number(e.target.value)
            // Inches and cm stay fixed when the resolution changes, so the pixels follow.
            if (physical) onDims(scaleDim(dims, next / dpi))
            onDpi(next)
          }}
        >
          {DPIS.map((d) => (
            <option key={d} value={d}>
              {d} dpi
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-[var(--muted)]" data-testid="print-size">
        {dims.width}×{dims.height} px = {inches(dims.width)}×{inches(dims.height)} in ={' '}
        {cms(dims.width)}×{cms(dims.height)} cm at {dpi} dpi
        {physical ? '. JPEG and PNG files are tagged with this dpi.' : ''}
      </p>

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
    </div>
  )
}
