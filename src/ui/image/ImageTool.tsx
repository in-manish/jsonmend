import { Announcer } from '../Announcer'
import { ImageEditor } from './edit/ImageEditor'
import { ImagesToPdf } from './pdf/ImagesToPdf'
import { PdfToImages } from './pdf/PdfToImages'
import { type ImageMode, useImageStore } from './useImageStore'

const MODES: { id: ImageMode; label: string; short: string }[] = [
  { id: 'edit', label: 'Resize, convert, compress', short: 'Edit photo' },
  { id: 'pdf-to-images', label: 'PDF to images', short: 'PDF → image' },
  { id: 'images-to-pdf', label: 'Images to PDF', short: 'Image → PDF' },
]

/** Image tools: edit one image, turn PDF pages into images, or combine images into a PDF. */
export function ImageTool() {
  const mode = useImageStore((s) => s.prefs.mode)
  const setMode = useImageStore((s) => s.setMode)
  return (
    <div className="image-tool flex h-full flex-col">
      <div
        role="tablist"
        aria-label="Image tool mode"
        className="mode-tabs flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 md:px-3 md:py-2 [&>*]:shrink-0"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className="btn"
            style={
              mode === m.id ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined
            }
            onClick={() => setMode(m.id)}
          >
            <span className="md:hidden">{m.short}</span>
            <span className="hidden md:inline">{m.label}</span>
          </button>
        ))}
        <span className="ml-2 hidden self-center text-xs text-[var(--muted)] md:inline">
          Everything runs in your browser; files are never uploaded.
        </span>
      </div>
      {/* All three stay mounted so switching modes keeps the opened files. */}
      <div className="min-h-0 flex-1">
        <div role="tabpanel" className={mode === 'edit' ? 'h-full' : 'hidden'}>
          <ImageEditor />
        </div>
        <div role="tabpanel" className={mode === 'pdf-to-images' ? 'h-full' : 'hidden'}>
          <PdfToImages />
        </div>
        <div role="tabpanel" className={mode === 'images-to-pdf' ? 'h-full' : 'hidden'}>
          <ImagesToPdf />
        </div>
      </div>
      <Announcer />
    </div>
  )
}
