import { useState } from 'react'
import type { BatchSizeMode } from '../../../core/image/batch'
import { NumField } from '../NumField'
import type { ImagePrefs } from '../useImageStore'

type Prefs = ImagePrefs['batch']

const CHIPS: { label: string; mode: BatchSizeMode; value: number }[] = [
  { label: 'Original', mode: 'original', value: 0 },
  { label: 'Half', mode: 'percent', value: 50 },
  { label: 'Quarter', mode: 'percent', value: 25 },
  { label: '1920 px', mode: 'longest', value: 1920 },
  { label: '1280 px', mode: 'longest', value: 1280 },
  { label: '800 px', mode: 'longest', value: 800 },
]

/** Short text for a collapsed section header. */
export const sizeSummary = (p: Prefs) =>
  p.sizeMode === 'original'
    ? 'Original size'
    : p.sizeMode === 'percent'
      ? `${p.sizeValue}% of original`
      : `Longest side ${p.sizeValue} px`

interface Props {
  prefs: Prefs
  onChange(patch: Partial<Omit<Prefs, 'target'>>): void
}

/** How big every photo becomes: a few one-tap sizes, or an exact percentage / pixel length. */
export function BatchSize({ prefs, onChange }: Props) {
  const matches = (c: (typeof CHIPS)[number]) =>
    c.mode === prefs.sizeMode && (c.mode === 'original' || c.value === prefs.sizeValue)
  const [custom, setCustom] = useState(() => !CHIPS.some(matches))
  const percent = prefs.sizeMode === 'percent'

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0" aria-label="Batch sizes">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            className="btn crop-chip"
            aria-pressed={!custom && matches(c)}
            onClick={() => {
              setCustom(false)
              onChange({ sizeMode: c.mode, sizeValue: c.value || prefs.sizeValue })
            }}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          className="btn crop-chip"
          aria-pressed={custom}
          onClick={() => {
            setCustom(!custom)
            if (!custom && prefs.sizeMode === 'original') {
              onChange({ sizeMode: 'longest', sizeValue: 1920 })
            }
          }}
        >
          Custom
        </button>
      </fieldset>
      {custom && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input-sm"
            aria-label="Batch size unit"
            value={percent ? 'percent' : 'longest'}
            onChange={(e) => {
              const mode = e.target.value as BatchSizeMode
              // Keep the number sensible for the new unit.
              const sizeValue =
                mode === 'percent'
                  ? prefs.sizeValue <= 100
                    ? prefs.sizeValue
                    : 50
                  : prefs.sizeValue > 100
                    ? prefs.sizeValue
                    : 1920
              onChange({ sizeMode: mode, sizeValue })
            }}
          >
            <option value="longest">Longest side (px)</option>
            <option value="percent">Percent of original</option>
          </select>
          <NumField
            label="Size"
            value={prefs.sizeValue}
            min={1}
            max={percent ? 100 : 16384}
            suffix={percent ? '%' : 'px'}
            onCommit={(sizeValue) => onChange({ sizeValue })}
          />
        </div>
      )}
      <p className="text-xs text-[var(--muted)]">
        Photos already smaller than the size you pick are not enlarged.
      </p>
    </div>
  )
}
