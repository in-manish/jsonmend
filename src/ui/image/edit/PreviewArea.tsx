import type { Rect } from '../../../core/image/crop'
import { CropView } from './CropView'

export type PreviewView = 'result' | 'original' | 'both' | 'crop'

interface Caption {
  url?: string
  label: string
  alt: string
}

const VIEWS: { id: PreviewView; label: string }[] = [
  { id: 'result', label: 'Result' },
  { id: 'original', label: 'Original' },
  { id: 'both', label: 'Side by side' },
  { id: 'crop', label: 'Crop' },
]

function Frame({ c, zoom, onTap }: { c: Caption; zoom: 'fit' | 'actual'; onTap(): void }) {
  return (
    <figure className="m-0 flex min-h-0 min-w-0 flex-1 flex-col">
      <figcaption className="px-2 py-1 text-xs text-[var(--muted)]">
        {c.label} · tap the image to crop
      </figcaption>
      <div
        className={`checkerboard min-h-0 flex-1 ${zoom === 'actual' ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden'}`}
      >
        {c.url && (
          <button
            type="button"
            onClick={onTap}
            aria-label={`${c.alt}: tap to crop`}
            className={`block border-0 bg-transparent p-0 ${zoom === 'fit' ? 'max-h-full max-w-full' : ''}`}
            style={{ cursor: 'crosshair' }}
          >
            <img
              src={c.url}
              alt={c.alt}
              className={zoom === 'fit' ? 'max-h-full max-w-full object-contain' : 'max-w-none'}
            />
          </button>
        )}
      </div>
    </figure>
  )
}

interface Props {
  original: Caption
  result: Caption
  view: PreviewView
  zoom: 'fit' | 'actual'
  onView(v: PreviewView): void
  onZoom(z: 'fit' | 'actual'): void
  /** Crop mode: the full image, the crop already applied, and what to do with a new one. */
  crop: {
    /** Changes when the picture is turned, so a half-drawn selection starts over. */
    key: string
    /** The image to draw the overlay on (turned as chosen) and its oriented size. */
    src: string | undefined
    width: number
    height: number
    applied: Rect | undefined
    onApply(rect: Rect | undefined): void
  }
}

/** Preview mode: result, original, both, or crop (tap any image to start cropping). */
export function PreviewArea({ original, result, view, zoom, onView, onZoom, crop }: Props) {
  const goCrop = () => onView('crop')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 [&>*]:shrink-0">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="btn"
            aria-pressed={view === v.id}
            onClick={() => onView(v.id)}
          >
            {v.label}
          </button>
        ))}
        {view !== 'crop' && (
          <button
            type="button"
            className="btn ml-auto"
            aria-pressed={zoom === 'actual'}
            onClick={() => onZoom(zoom === 'fit' ? 'actual' : 'fit')}
            title="Toggle between fitting the pane and actual pixels"
          >
            {zoom === 'fit' ? 'Actual size' : 'Fit to pane'}
          </button>
        )}
      </div>
      {view === 'crop' ? (
        <CropView
          key={crop.key}
          src={crop.src}
          width={crop.width}
          height={crop.height}
          applied={crop.applied}
          onApply={(r) => {
            crop.onApply(r)
            onView('result')
          }}
          onCancel={() => onView('result')}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-px md:flex-row">
          {(view === 'original' || view === 'both') && (
            <Frame c={original} zoom={zoom} onTap={goCrop} />
          )}
          {(view === 'result' || view === 'both') && (
            <Frame c={result} zoom={zoom} onTap={goCrop} />
          )}
        </div>
      )}
    </div>
  )
}
