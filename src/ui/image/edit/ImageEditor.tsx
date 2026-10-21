import { useCallback, useState } from 'react'
import { fullRect, type Rect } from '../../../core/image/crop'
import type { Dim } from '../../../core/image/dims'
import {
  IDENTITY,
  isIdentity,
  type Orientation,
  orientedDim,
  rectFromOriented,
  rectToOriented,
  swapsAxes,
} from '../../../core/image/orient'
import { formatBytes } from '../../../core/image/size'
import { useAppStore } from '../../../store/useAppStore'
import { downloadBlob } from '../../lib/files'
import { DropZone } from '../DropZone'
import { baseName, EXTENSION, type Loaded, loadImage, typeLabel } from '../lib/canvas'
import { useObjectUrl } from '../lib/useObjectUrl'
import { useOrientedUrl } from '../lib/useOrientedUrl'
import { useImageStore } from '../useImageStore'
import { ActionBar } from './ActionBar'
import { EditorControls } from './EditorControls'
import { PreviewArea, type PreviewView } from './PreviewArea'
import { useEncode } from './useEncode'

interface Opened {
  file: File
  img: Loaded
}

/**
 * Crop, rotate, resize, convert and compress one image. Phone first: the preview stays pinned on
 * top while the controls scroll below it, with the result and Download always in reach; from `md`
 * up the controls move to a sidebar. Order of operations: crop, then rotate / flip, then resize.
 */
export function ImageEditor() {
  const edit = useImageStore((s) => s.prefs.edit)
  const setEdit = useImageStore((s) => s.setEdit)
  const setTarget = useImageStore((s) => s.setEditTarget)
  const notify = useAppStore((s) => s.notify)
  const [opened, setOpened] = useState<Opened>()
  const [dims, setDims] = useState<Dim>()
  /** Kept region, in pixels of the original picture. */
  const [crop, setCrop] = useState<Rect>()
  const [orient, setOrient] = useState<Orientation>(IDENTITY)
  const [view, setView] = useState<PreviewView>('result')
  const [zoom, setZoom] = useState<'fit' | 'actual'>('fit')
  const physical = edit.unit === 'in' || edit.unit === 'cm'
  const state = useEncode(opened?.img, dims, edit, crop, physical ? edit.dpi : undefined, orient)

  const open = useCallback(
    async (files: File[]) => {
      try {
        const file = files[0]
        const img = await loadImage(file)
        setOpened({ file, img })
        setDims({ width: img.width, height: img.height })
        setCrop(undefined)
        setOrient(IDENTITY)
        setView('result')
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Could not open the image')
      }
    },
    [notify],
  )

  const originalUrl = useObjectUrl(opened?.file)
  const resultUrl = useObjectUrl(state.out?.blob)
  const orientedUrl = useOrientedUrl(opened?.img, orient)

  if (!opened || !dims) {
    return (
      <div className="image-tool flex h-full items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <DropZone
            paste
            accept="image/*"
            label="Tap to choose an image, or drop / paste one"
            hint="JPEG, PNG, WebP, GIF, BMP, AVIF, SVG. It stays in your browser."
            onFiles={open}
          />
        </div>
      </div>
    )
  }

  const { img } = opened
  const full = { width: img.width, height: img.height }
  const kept = crop ? { width: crop.w, height: crop.h } : full
  // Resize fields (percent, presets, "Original") are relative to the cropped, turned picture.
  const base = orientedDim(kept, orient)
  const turnedFull = orientedDim(full, orient)
  const out = state.out
  const cropping = view === 'crop'

  const changeOrient = (next: Orientation) => {
    // A quarter turn swaps the sides, so the chosen size follows the picture.
    if (swapsAxes(next) !== swapsAxes(orient)) setDims({ width: dims.height, height: dims.width })
    setOrient(next)
  }

  /** `rect` is drawn on the turned picture; the crop is stored on the original. */
  const applyCrop = (rect: Rect | undefined) => {
    const source = rect && rectFromOriented(rect, full, orient)
    const whole = source && source.w === img.width && source.h === img.height
    const next = source && !whole ? source : undefined
    setCrop(next)
    setDims(orientedDim(next ? { width: next.w, height: next.h } : full, orient))
  }

  return (
    <div className="image-tool flex h-full flex-col md:flex-row">
      <div
        className={`min-h-0 min-w-0 md:order-2 md:h-auto md:flex-1 ${
          cropping ? 'flex-1' : 'h-[42dvh] min-h-[14rem] flex-none'
        }`}
      >
        <PreviewArea
          view={view}
          zoom={zoom}
          onView={setView}
          onZoom={setZoom}
          crop={{
            key: `${orient.turns}${orient.flipH}${orient.flipV}`,
            src: isIdentity(orient) ? originalUrl : orientedUrl,
            width: turnedFull.width,
            height: turnedFull.height,
            applied: crop && rectToOriented(crop, full, orient),
            onApply: applyCrop,
          }}
          original={{
            url: originalUrl,
            label: `Original · ${img.width}×${img.height} · ${formatBytes(img.bytes)}`,
            alt: 'Original image',
          }}
          result={{
            url: resultUrl,
            label: out
              ? `Result · ${out.width}×${out.height} · ${formatBytes(out.blob.size)}${state.status === 'working' ? ' · updating…' : ''}`
              : 'Result · calculating…',
            alt: 'Resized image preview',
          }}
        />
      </div>
      <aside
        aria-label="Image settings"
        className={`min-h-0 flex-1 flex-col border-t border-[var(--border)] bg-[var(--panel)] md:order-1 md:flex md:w-80 md:flex-none md:border-t-0 md:border-r ${
          cropping ? 'hidden' : 'flex'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-medium" title={img.name}>
                {img.name}
              </div>
              <div className="text-[var(--muted)]">
                {typeLabel(img.type)} · {img.width}×{img.height} · {formatBytes(img.bytes)}
              </div>
            </div>
            <button type="button" className="btn" onClick={() => setOpened(undefined)}>
              Change
            </button>
          </div>
          <EditorControls
            img={img}
            dims={dims}
            base={base}
            crop={crop}
            orient={orient}
            edit={edit}
            state={state}
            onDims={setDims}
            onOrient={changeOrient}
            onStartCrop={() => setView('crop')}
            onRemoveCrop={() => applyCrop(fullRect(turnedFull))}
            onEdit={setEdit}
            onTarget={setTarget}
          />
        </div>
        <ActionBar
          img={img}
          edit={edit}
          state={state}
          onDownload={() =>
            out &&
            downloadBlob(
              out.blob,
              `${baseName(img.name)}-${out.width}x${out.height}.${EXTENSION[edit.format]}`,
            )
          }
        />
      </aside>
    </div>
  )
}
