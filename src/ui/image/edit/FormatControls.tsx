import { useEffect, useState } from 'react'
import { isLossy, LABEL, type OutFormat, supportsAvif } from '../lib/canvas'
import type { ImagePrefs } from '../useImageStore'

interface Props {
  edit: ImagePrefs['edit']
  onChange(patch: Partial<ImagePrefs['edit']>): void
}

export function FormatControls({ edit, onChange }: Props) {
  const [avif, setAvif] = useState(false)
  useEffect(() => {
    supportsAvif().then(setAvif)
  }, [])
  const formats: OutFormat[] = ['jpeg', 'png', 'webp', ...(avif ? (['avif'] as const) : [])]
  const lossy = isLossy(edit.format)

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="pane-title !px-0">Format and quality</legend>
      <label className="flex items-center gap-2 text-sm">
        <span className="w-14 flex-none text-[var(--muted)]">Format</span>
        <select
          className="input-sm"
          value={edit.format}
          onChange={(e) => onChange({ format: e.target.value as OutFormat })}
        >
          {formats.map((f) => (
            <option key={f} value={f}>
              {LABEL[f]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="w-14 flex-none text-[var(--muted)]">Quality</span>
        <input
          type="range"
          min={1}
          max={100}
          value={edit.quality}
          disabled={!lossy}
          aria-label="Quality"
          className="min-w-0 flex-1"
          onChange={(e) => onChange({ quality: Number(e.target.value) })}
        />
        <span className="w-10 text-right tabular-nums">{lossy ? `${edit.quality}%` : 'n/a'}</span>
      </label>
      {!lossy && (
        <p className="text-xs text-[var(--muted)]">
          PNG is lossless, so quality does not apply. To shrink it, resize, set a size limit, or
          switch to WebP or JPEG.
        </p>
      )}
      {edit.format === 'jpeg' && (
        <p className="text-xs text-[var(--muted)]">
          JPEG has no transparency: it is filled with white.
        </p>
      )}
    </fieldset>
  )
}
