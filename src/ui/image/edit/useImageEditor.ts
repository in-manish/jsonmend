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
import { baseName, EXTENSION, type Loaded, loadImage } from '../lib/canvas'
import { useObjectUrl } from '../lib/useObjectUrl'
import { useOrientedUrl } from '../lib/useOrientedUrl'
import { type ImagePrefs, type TargetPrefs, useImageStore } from '../useImageStore'
import type { PreviewView } from './PreviewArea'
import { type EncodeState, useEncode } from './useEncode'

/** Everything both editor layouts (phone and desktop) need about the open image. */
export interface EditorSession {
  /** The file that was opened. */
  file: File
  img: Loaded
  dims: Dim
  /** Size the resize fields are relative to: the cropped and turned picture. */
  base: Dim
  /** Kept region, in pixels of the original picture. */
  crop: Rect | undefined
  orient: Orientation
  view: PreviewView
  zoom: 'fit' | 'actual'
  state: EncodeState
  edit: ImagePrefs['edit']
  originalUrl: string | undefined
  resultUrl: string | undefined
  /** What the crop view needs: the turned picture, its size, and the crop as seen on it. */
  cropView: {
    key: string
    src: string | undefined
    width: number
    height: number
    applied: Rect | undefined
    onApply(rect: Rect | undefined): void
  }
  setDims(d: Dim): void
  setView(v: PreviewView): void
  setZoom(z: 'fit' | 'actual'): void
  setEdit(patch: Partial<ImagePrefs['edit']>): void
  setTarget(patch: Partial<TargetPrefs>): void
  changeOrient(o: Orientation): void
  removeCrop(): void
  close(): void
  download(): void
  resultLabel: string
}

/**
 * State of the image editor. Order of operations: crop (on the original), then turn / flip, then
 * resize; the encoder re-runs whenever any of them changes.
 */
export function useImageEditor() {
  const edit = useImageStore((s) => s.prefs.edit)
  const setEdit = useImageStore((s) => s.setEdit)
  const setTarget = useImageStore((s) => s.setEditTarget)
  const notify = useAppStore((s) => s.notify)
  const [opened, setOpened] = useState<{ file: File; img: Loaded }>()
  const [dims, setDims] = useState<Dim>()
  const [crop, setCrop] = useState<Rect>()
  const [orient, setOrient] = useState<Orientation>(IDENTITY)
  const [view, setView] = useState<PreviewView>('result')
  const [zoom, setZoom] = useState<'fit' | 'actual'>('fit')
  // A chosen dpi is written into JPG / PNG files whatever unit the size was set in.
  const state = useEncode(
    opened?.img,
    dims,
    edit,
    crop,
    edit.dpi > 0 ? edit.dpi : undefined,
    orient,
  )
  const originalUrl = useObjectUrl(opened?.file)
  const resultUrl = useObjectUrl(state.out?.blob)
  const orientedUrl = useOrientedUrl(opened?.img, orient)

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

  if (!opened || !dims) return { open, session: undefined }

  const { img } = opened
  const full = { width: img.width, height: img.height }
  const kept = crop ? { width: crop.w, height: crop.h } : full
  const turnedFull = orientedDim(full, orient)
  const out = state.out

  /** `rect` is drawn on the turned picture; the crop is stored on the original. */
  const applyCrop = (rect: Rect | undefined) => {
    const source = rect && rectFromOriented(rect, full, orient)
    const whole = source && source.w === img.width && source.h === img.height
    const next = source && !whole ? source : undefined
    setCrop(next)
    setDims(orientedDim(next ? { width: next.w, height: next.h } : full, orient))
  }

  const session: EditorSession = {
    file: opened.file,
    img,
    dims,
    base: orientedDim(kept, orient),
    crop,
    orient,
    view,
    zoom,
    state,
    edit,
    originalUrl,
    resultUrl,
    cropView: {
      key: `${orient.turns}${orient.flipH}${orient.flipV}`,
      src: isIdentity(orient) ? originalUrl : orientedUrl,
      width: turnedFull.width,
      height: turnedFull.height,
      applied: crop && rectToOriented(crop, full, orient),
      onApply: applyCrop,
    },
    setDims,
    setView,
    setZoom,
    setEdit,
    setTarget,
    changeOrient: (next) => {
      // A quarter turn swaps the sides, so the chosen size follows the picture.
      if (swapsAxes(next) !== swapsAxes(orient)) setDims({ width: dims.height, height: dims.width })
      setOrient(next)
    },
    removeCrop: () => applyCrop(fullRect(turnedFull)),
    close: () => setOpened(undefined),
    download: () => {
      if (!out) return
      const name = `${baseName(img.name)}-${out.width}x${out.height}.${EXTENSION[edit.format]}`
      downloadBlob(out.blob, name)
    },
    resultLabel: out
      ? `${out.width}×${out.height} · ${formatBytes(out.blob.size)}${state.status === 'working' ? ' · updating…' : ''}`
      : 'calculating…',
  }
  return { open, session }
}
