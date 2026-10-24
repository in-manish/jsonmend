import { useState } from 'react'
import type { SizeUnit } from '../../core/image/size'
import { NumField } from './NumField'
import type { TargetPrefs } from './useImageStore'

interface Props {
  target: TargetPrefs
  onChange(patch: Partial<TargetPrefs>): void
  /** Wording for what shrinks, e.g. "photo" or "PDF". */
  what?: string
  /** Size of the original file, for "25% / 50% / 75% smaller"; omitted, those are not offered. */
  originalBytes?: number
  /** Offer "No limit"; off when a limit is the whole point. */
  allowOff?: boolean
}

const PERCENTS = [25, 50, 75]
/** A limit in KB, one decimal, for "p% smaller than `bytes`". */
const smallerBy = (bytes: number, p: number) =>
  Math.max(1, Math.round(((bytes * (100 - p)) / 100 / 1024) * 10) / 10)

/** The limits upload forms usually ask for. */
const LIMITS: { value: number; unit: SizeUnit }[] = [
  { value: 100, unit: 'kb' },
  { value: 200, unit: 'kb' },
  { value: 500, unit: 'kb' },
  { value: 1, unit: 'mb' },
]
const text = (l: { value: number; unit: SizeUnit }) => `${l.value} ${l.unit.toUpperCase()}`

/** "Keep under": one tap for the usual upload limits, or a custom number in KB (default) / MB. */
export function TargetSizeControls({
  target,
  onChange,
  what = 'photo',
  originalBytes,
  allowOff = true,
}: Props) {
  const matches = (l: { value: number; unit: SizeUnit }) =>
    target.on && target.value === l.value && target.unit === l.unit
  const percent = (p: number) =>
    originalBytes === undefined
      ? undefined
      : { value: smallerBy(originalBytes, p), unit: 'kb' as const }
  const isPercent = PERCENTS.some((p) => {
    const l = percent(p)
    return l !== undefined && matches(l)
  })
  const known = LIMITS.some(matches) || isPercent
  const [custom, setCustom] = useState(() => target.on && !known)
  const showCustom = custom || (target.on && !known)

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0" aria-label="Keep under">
        {allowOff && (
          <button
            type="button"
            className="btn crop-chip"
            aria-pressed={!target.on}
            onClick={() => {
              setCustom(false)
              onChange({ on: false })
            }}
          >
            No limit
          </button>
        )}
        {LIMITS.map((l) => (
          <button
            key={text(l)}
            type="button"
            className="btn crop-chip"
            aria-label={`Under ${text(l)}`}
            aria-pressed={matches(l)}
            onClick={() => {
              setCustom(false)
              onChange({ on: true, value: l.value, unit: l.unit })
            }}
          >
            {text(l)}
          </button>
        ))}
        <button
          type="button"
          className="btn crop-chip"
          aria-pressed={showCustom}
          onClick={() => {
            setCustom(true)
            onChange({ on: true })
          }}
        >
          Other
        </button>
      </fieldset>

      {originalBytes !== undefined && (
        <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0" aria-label="Smaller by">
          {PERCENTS.map((p) => {
            const l = percent(p) as { value: number; unit: SizeUnit }
            return (
              <button
                key={p}
                type="button"
                className="btn crop-chip"
                aria-pressed={matches(l)}
                onClick={() => {
                  setCustom(false)
                  onChange({ on: true, ...l })
                }}
              >
                {p}% smaller
              </button>
            )
          })}
        </fieldset>
      )}

      {showCustom && (
        <>
          <div className="flex items-center gap-1">
            <NumField
              label="Limit"
              value={target.value}
              min={0.01}
              step={target.unit === 'mb' ? 0.1 : 10}
              onCommit={(value) => onChange({ on: true, value })}
            />
            <select
              className="input-sm"
              aria-label="Size unit"
              value={target.unit}
              onChange={(e) => onChange({ on: true, unit: e.target.value as SizeUnit })}
            >
              <option value="kb">KB</option>
              <option value="mb">MB</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={target.allowScale}
              onChange={(e) => onChange({ allowScale: e.target.checked })}
            />
            Shrink the {what} too if needed
          </label>
        </>
      )}
    </div>
  )
}
