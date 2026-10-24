import { useState } from 'react'
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

const WIDTHS = [1920, 1280, 800]
export const DPIS = [
  { dpi: 0, label: 'Not set' },
  { dpi: 72, label: '72 (web)' },
  { dpi: 96, label: '96 (screen)' },
  { dpi: 150, label: '150 (good print)' },
  { dpi: 200, label: '200' },
  { dpi: 300, label: '300 (best print)' },
  { dpi: 600, label: '600 (professional)' },
]
/** Used for inches / cm while no dpi is chosen. */
const DEFAULT_PRINT_DPI = 300
const UNITS: { id: ResizeUnit; label: string }[] = [
  { id: 'px', label: 'Pixels' },
  { id: 'percent', label: '%' },
  { id: 'in', label: 'Inches' },
  { id: 'cm', label: 'cm' },
]

interface Props {
  /** The picture being resized: the whole image, or the cropped part. */
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

const same = (a: Dim, b: Dim) => a.width === b.width && a.height === b.height

/** A few one-tap sizes; exact pixels, percent, inches and cm only when "Custom" is opened. */
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
  const quick = [
    { label: 'Original', dims: original },
    { label: 'Half', dims: fromPercent(original, 50) },
    { label: 'Quarter', dims: fromPercent(original, 25) },
    ...WIDTHS.filter((w) => w < original.width).map((w) => ({
      label: `${w} px`,
      dims: { width: w, height: linkedHeight(original, w) },
    })),
  ]
  const [custom, setCustom] = useState(
    () => unit !== 'px' || !quick.some((q) => same(q.dims, dims)),
  )
  const percent = Math.round((dims.width / original.width) * 1000) / 10
  const physical = unit === 'in' || unit === 'cm'
  const printDpi = dpi || DEFAULT_PRINT_DPI
  const setWidth = (w: number) =>
    onDims({ width: w, height: lock ? linkedHeight(original, w) : dims.height })
  const setHeight = (h: number) =>
    onDims({ width: lock ? linkedWidth(original, h) : dims.width, height: h })
  const field = (label: 'Width' | 'Height', px: number, set: (v: number) => void) => (
    <NumField
      label={label}
      value={physical ? pxToPhysical(px, unit, printDpi) : px}
      min={physical ? 0.01 : 1}
      max={physical ? pxToPhysical(MAX_EDGE, unit, printDpi) : MAX_EDGE}
      step={physical ? 0.1 : 1}
      suffix={physical ? unit : 'px'}
      onCommit={(v) => set(physical ? physicalToPx(v, unit, printDpi) : v)}
    />
  )

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0" aria-label="Quick sizes">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            aria-pressed={!custom && same(q.dims, dims)}
            className="btn crop-chip"
            onClick={() => {
              setCustom(false)
              onDims(q.dims)
            }}
          >
            {q.label}
          </button>
        ))}
        <button
          type="button"
          className="btn crop-chip"
          aria-pressed={custom}
          onClick={() => setCustom(!custom)}
        >
          Custom
        </button>
      </fieldset>

      {custom && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Resize units">
            {UNITS.map((u) => (
              <button
                key={u.id}
                type="button"
                role="tab"
                aria-selected={unit === u.id}
                className="btn crop-chip"
                onClick={() => {
                  // Inches and cm need a resolution; start from best print quality.
                  if ((u.id === 'in' || u.id === 'cm') && !dpi) onDpi(DEFAULT_PRINT_DPI)
                  onUnit(u.id)
                }}
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
              {field('Width', dims.width, setWidth)}
              {field('Height', dims.height, setHeight)}
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={lock} onChange={(e) => onLock(e.target.checked)} />
            Keep proportions
          </label>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <span className="flex-none text-[var(--muted)]">DPI</span>
        <select
          className="input-sm min-w-0 flex-1"
          aria-label="Print resolution"
          value={dpi}
          onChange={(e) => {
            const next = Number(e.target.value)
            // In inches / cm the printed size stays the same, so the pixels follow.
            if (physical && next) onDims(scaleDim(dims, next / printDpi))
            onDpi(next)
          }}
        >
          {DPIS.map((d) => (
            <option key={d.dpi} value={d.dpi} disabled={physical && d.dpi === 0}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      {dpi > 0 && (
        <p className="text-xs text-[var(--muted)]" data-testid="print-size">
          {dims.width}×{dims.height} px = {pxToPhysical(dims.width, 'in', dpi)}×
          {pxToPhysical(dims.height, 'in', dpi)} in = {pxToPhysical(dims.width, 'cm', dpi)}×
          {pxToPhysical(dims.height, 'cm', dpi)} cm at {dpi} dpi (saved in JPG and PNG)
        </p>
      )}
      {(dims.width > original.width || dims.height > original.height) && (
        <p className="text-xs text-[var(--warn)]">Bigger than the original: no extra detail.</p>
      )}
    </div>
  )
}
