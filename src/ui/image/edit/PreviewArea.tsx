import { useState } from 'react'

export type PreviewView = 'result' | 'original' | 'both'

interface Caption {
  url?: string
  label: string
  alt: string
}

const VIEWS: { id: PreviewView; label: string }[] = [
  { id: 'result', label: 'Result' },
  { id: 'original', label: 'Original' },
  { id: 'both', label: 'Side by side' },
]

function Frame({ c, zoom }: { c: Caption; zoom: 'fit' | 'actual' }) {
  return (
    <figure className="m-0 flex min-h-0 min-w-0 flex-1 flex-col">
      <figcaption className="px-2 py-1 text-xs text-[var(--muted)]">{c.label}</figcaption>
      <div
        className={`checkerboard min-h-0 flex-1 ${zoom === 'actual' ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden'}`}
      >
        {c.url && (
          <img
            src={c.url}
            alt={c.alt}
            className={zoom === 'fit' ? 'max-h-full max-w-full object-contain' : 'max-w-none'}
          />
        )}
      </div>
    </figure>
  )
}

/** Preview mode: the result, the original, or both side by side; fit to the pane or 100%. */
export function PreviewArea({ original, result }: { original: Caption; result: Caption }) {
  const [view, setView] = useState<PreviewView>('result')
  const [zoom, setZoom] = useState<'fit' | 'actual'>('fit')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--panel)] px-2 py-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="btn"
            aria-pressed={view === v.id}
            style={view === v.id ? { borderColor: 'var(--accent)' } : undefined}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          className="btn"
          aria-pressed={zoom === 'actual'}
          onClick={() => setZoom(zoom === 'fit' ? 'actual' : 'fit')}
          title="Toggle between fitting the pane and actual pixels"
        >
          {zoom === 'fit' ? 'Actual size' : 'Fit to pane'}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-px md:flex-row">
        {(view === 'original' || view === 'both') && <Frame c={original} zoom={zoom} />}
        {(view === 'result' || view === 'both') && <Frame c={result} zoom={zoom} />}
      </div>
    </div>
  )
}
