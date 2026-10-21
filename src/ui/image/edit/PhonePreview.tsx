import { useState } from 'react'
import type { EditorSession } from './useImageEditor'

/**
 * The phone preview: the picture fills the space, with small controls floating over it
 * (Before / After, close) and the size as a caption. Tapping the picture starts cropping.
 * `bare` hides the overlays, for when a tool panel leaves the picture little room.
 */
export function PhonePreview({ s, bare }: { s: EditorSession; bare?: boolean }) {
  const [before, setBefore] = useState(false)
  const url = before ? s.originalUrl : s.resultUrl

  return (
    <div className="checkerboard relative flex h-full min-h-0 items-center justify-center overflow-hidden">
      {url && (
        <button
          type="button"
          onClick={() => s.setView('crop')}
          aria-label={`${before ? 'Original image' : 'Resized image preview'}: tap to crop`}
          className="absolute inset-0 flex items-center justify-center border-0 bg-transparent p-2"
        >
          <img
            src={url}
            alt={before ? 'Original image' : 'Resized image preview'}
            className="max-h-full max-w-full object-contain"
          />
        </button>
      )}

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2 ${bare ? 'hidden' : ''}`}
      >
        <fieldset
          aria-label="Compare"
          className="pointer-events-auto m-0 flex border-0 p-0 overflow-hidden rounded-full bg-black/60 text-[13px] font-medium text-white shadow backdrop-blur"
        >
          {(['After', 'Before'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={(v === 'Before') === before}
              onClick={() => setBefore(v === 'Before')}
              className={`h-9 px-3.5 ${(v === 'Before') === before ? 'bg-white/25' : ''}`}
            >
              {v}
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          onClick={s.close}
          aria-label="Close image"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow backdrop-blur"
        >
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
