import { useEffect, useId, useState } from 'react'
import { isLossy, LABEL, type OutFormat, supportsAvif } from '../lib/canvas'

interface Settings {
  format: OutFormat
  quality: number
}

interface Props {
  edit: Settings
  onChange(patch: Partial<Settings>): void
  /** Show the quality slider (and the PNG note); off when only the file type matters. */
  quality?: boolean
}

/** What each file type is for, in two words. */
const FOR: Record<OutFormat, string> = {
  jpeg: 'Photos',
  png: 'Screenshots',
  webp: 'Smallest',
  avif: 'Smallest, newer',
}

/** "Save as": file type, then one quality slider. */
export function FormatControls({ edit, onChange, quality = true }: Props) {
  // Each editor keeps its own radio group; they stay mounted side by side.
  const group = useId()
  const [avif, setAvif] = useState(false)
  useEffect(() => {
    supportsAvif().then(setAvif)
  }, [])
  const formats: OutFormat[] = ['jpeg', 'png', 'webp', ...(avif ? (['avif'] as const) : [])]

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 grid grid-cols-3 gap-1.5 border-0 p-0">
        <legend className="sr-only">File type</legend>
        {formats.map((f) => (
          <label
            key={f}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-2 text-center ${
              edit.format === f
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border)]'
            }`}
          >
            <input
              type="radio"
              name={group}
              value={f}
              checked={edit.format === f}
              onChange={() => onChange({ format: f })}
              className="sr-only"
            />
            <span className="text-sm font-semibold">{LABEL[f]}</span>
            <span className="text-[11px] leading-tight text-[var(--muted)]">{FOR[f]}</span>
          </label>
        ))}
      </fieldset>

      {quality && !isLossy(edit.format) && (
        <p className="text-xs text-[var(--muted)]">
          PNG has no quality setting. To compress, use File size or pick JPG / WebP.
        </p>
      )}
      {quality && isLossy(edit.format) && (
        <label className="flex flex-col gap-1">
          <span className="flex justify-between text-xs text-[var(--muted)]">
            <span>Smaller file</span>
            <span className="tabular-nums">Quality {edit.quality}% (compression)</span>
            <span>Better</span>
          </span>
          <input
            type="range"
            min={1}
            max={100}
            value={edit.quality}
            aria-label="Quality"
            className="w-full"
            onChange={(e) => onChange({ quality: Number(e.target.value) })}
          />
        </label>
      )}
    </div>
  )
}
