import { useEffect, useRef, useState } from 'react'
import { savedPercent } from '../../../core/image/batch'
import { formatBytes } from '../../../core/image/size'
import { downloadBlob } from '../../lib/files'
import { useObjectUrl } from '../lib/useObjectUrl'
import type { ImagePrefs } from '../useImageStore'
import { Compare } from './Compare'
import type { BatchItem } from './useBatch'
import { usePreview } from './usePreview'
import { outputName } from './zipResults'

type View = 'after' | 'before' | 'compare'
const VIEWS: { id: View; label: string }[] = [
  { id: 'after', label: 'After' },
  { id: 'before', label: 'Before' },
  { id: 'compare', label: 'Slide to compare' },
]

interface Props {
  items: BatchItem[]
  /** Id of the photo being looked at. */
  id: number
  prefs: ImagePrefs['batch']
  onSelect(id: number): void
  onClose(): void
}

/** Full-screen look at one photo: before, after, or a slider between them, then download it. */
export function PhotoViewer({ items, id, prefs, onSelect, onClose }: Props) {
  const index = Math.max(
    0,
    items.findIndex((i) => i.id === id),
  )
  const item = items[index]
  const [view, setView] = useState<View>('after')
  const preview = usePreview(item, prefs)
  const beforeUrl = useObjectUrl(item?.file)
  const afterUrl = useObjectUrl(preview.out?.blob)
  const close = useRef<HTMLButtonElement>(null)

  const go = (step: number) => {
    const next = items[index + step]
    if (next) onSelect(next.id)
  }
  useEffect(() => {
    close.current?.focus()
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  if (!item) return null

  const { out } = preview
  const saved = out ? savedPercent(item.file.size, out.blob.size) : undefined

  const wait = (text: string) => (
    <p className="rounded bg-[var(--panel)] px-3 py-2 text-sm">{text}</p>
  )
  const picture = (src: string, alt: string) => (
    <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
  )
  const shown = preview.error ? (
    <p className="text-[var(--error)]">{preview.error}</p>
  ) : view === 'before' ? (
    beforeUrl ? (
      picture(beforeUrl, 'Before')
    ) : (
      wait('Loading…')
    )
  ) : !afterUrl || !beforeUrl ? (
    wait('Making a preview…')
  ) : view === 'compare' ? (
    <Compare before={beforeUrl} after={afterUrl} />
  ) : (
    picture(afterUrl, 'After')
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${item.file.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] text-[var(--fg)]"
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-medium" title={item.file.name}>
          {item.file.name}
        </span>
        <span className="flex-none text-sm text-[var(--muted)]">
          {index + 1} of {items.length}
        </span>
        <button ref={close} type="button" className="btn flex-none" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="checkerboard flex min-h-0 flex-1 items-center justify-center overflow-auto p-3">
        {shown}
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-[var(--panel)] p-3">
        <fieldset
          className="m-0 flex flex-wrap justify-center gap-1.5 border-0 p-0"
          aria-label="What to show"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="btn crop-chip"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </fieldset>
        <p className="text-center text-sm" role="status">
          {formatBytes(item.file.size)}
          {out &&
            ` → ${out.width}×${out.height} · ${formatBytes(out.blob.size)}${
              saved ? ` (${saved}% smaller)` : ''
            }`}
        </p>
        {preview.trial && out && (
          <p className="text-center text-xs text-[var(--muted)]">
            This is how it will look. Press the blue button to do all your photos.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn flex-1"
            disabled={index === 0}
            onClick={() => go(-1)}
          >
            ‹ Previous
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={!out}
            onClick={() => out && downloadBlob(out.blob, outputName(item.file, prefs.format))}
          >
            Download this photo
          </button>
          <button
            type="button"
            className="btn flex-1"
            disabled={index === items.length - 1}
            onClick={() => go(1)}
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  )
}
