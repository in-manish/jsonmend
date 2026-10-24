import { useEffect, useRef, useState } from 'react'
import { defaultRect, fitAspect, fullRect, type Rect } from '../../../core/image/crop'
import type { FormDoc, FormPreset } from '../../../core/image/formPresets'
import { formatBytes } from '../../../core/image/size'
import { downloadBlob } from '../../lib/files'
import { CropOverlay } from '../edit/CropOverlay'
import type { Loaded } from '../lib/canvas'
import { findPhotoEdges } from '../lib/findPhotoEdges'
import { useFormEncode } from './useFormEncode'

interface Props {
  img: Loaded
  src: string
  form: FormPreset
  doc: FormDoc
  onBack(): void
}

/** Step two: the box starts on the printed photo's edges (if found); adjust, check, download. */
export function FormFrame({ img, src, form, doc, onBack }: Props) {
  const bounds = { width: img.width, height: img.height }
  const aspect = doc.width / doc.height
  const [rect, setRect] = useState<Rect | undefined>(() => defaultRect(bounds, aspect))
  const [foundEdges, setFoundEdges] = useState(false)
  const moved = useRef(false)

  // Look for the photo's edges once; a person who already started dragging is not interrupted.
  useEffect(() => {
    const edges = findPhotoEdges(img)
    if (!edges || moved.current) return
    setRect(fitAspect(edges, doc.width / doc.height, { width: img.width, height: img.height }))
    setFoundEdges(true)
  }, [img, doc])

  const state = useFormEncode(img, doc, rect)
  const out = state.out
  const ready = state.status === 'done' && out
  const name = `${form.id}-${doc.id}.jpg`

  return (
    <div className="image-tool flex h-full min-h-0 flex-col">
      <CropOverlay
        src={src}
        width={img.width}
        height={img.height}
        rect={rect}
        aspect={aspect}
        onChange={(r) => {
          if (!r) return
          moved.current = true
          setFoundEdges(false)
          setRect(r)
        }}
      />
      <section
        aria-label="Photo for a form"
        className="flex flex-none flex-col gap-2 border-t border-[var(--border)] bg-[var(--panel)] p-3"
      >
        <p className="text-sm" data-testid="form-hint">
          {foundEdges
            ? 'We found the edges of your photo and selected it. Move or resize the box if it is not right.'
            : 'Drag the box over the part you want to keep.'}
        </p>
        <p className="text-sm font-medium" role="status" data-testid="form-status">
          {state.status === 'error'
            ? state.error
            : !ready
              ? 'Checking…'
              : out.met
                ? `✓ ${doc.width} × ${doc.height} px · ${formatBytes(out.blob.size)}. Ready for ${form.name}.`
                : `Could not get under ${doc.maxKb} KB. Try a different part of the photo.`}
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              moved.current = true
              setFoundEdges(false)
              setRect(fitAspect(fullRect(bounds), aspect, bounds))
            }}
          >
            Whole picture
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={!ready || !out.met}
            onClick={() => out && downloadBlob(out.blob, name)}
          >
            Download JPG
          </button>
        </div>
      </section>
    </div>
  )
}
