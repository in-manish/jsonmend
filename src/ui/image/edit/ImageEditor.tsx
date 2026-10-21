import { useCallback, useState } from 'react'
import type { Dim } from '../../../core/image/dims'
import { formatBytes } from '../../../core/image/size'
import { useAppStore } from '../../../store/useAppStore'
import { downloadBlob } from '../../lib/files'
import { DropZone } from '../DropZone'
import { baseName, EXTENSION, type Loaded, loadImage, typeLabel } from '../lib/canvas'
import { useObjectUrl } from '../lib/useObjectUrl'
import { TargetSizeControls } from '../TargetSizeControls'
import { useImageStore } from '../useImageStore'
import { FormatControls } from './FormatControls'
import { PreviewArea } from './PreviewArea'
import { ResizeControls } from './ResizeControls'
import { ResultSummary } from './ResultSummary'
import { useEncode } from './useEncode'

interface Opened {
  file: File
  img: Loaded
}

/** Resize, convert and compress one image, with a live preview and calculated output size. */
export function ImageEditor() {
  const edit = useImageStore((s) => s.prefs.edit)
  const setEdit = useImageStore((s) => s.setEdit)
  const setTarget = useImageStore((s) => s.setEditTarget)
  const notify = useAppStore((s) => s.notify)
  const [opened, setOpened] = useState<Opened>()
  const [dims, setDims] = useState<Dim>()
  const state = useEncode(opened?.img, dims, edit)

  const open = useCallback(
    async (files: File[]) => {
      try {
        const file = files[0]
        const img = await loadImage(file)
        setOpened({ file, img })
        setDims({ width: img.width, height: img.height })
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Could not open the image')
      }
    },
    [notify],
  )

  const originalUrl = useObjectUrl(opened?.file)
  const resultUrl = useObjectUrl(state.out?.blob)

  if (!opened || !dims) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <DropZone
            paste
            accept="image/*"
            label="Choose an image, drop it here, or paste one"
            hint="JPEG, PNG, WebP, GIF, BMP, AVIF, SVG. It stays in your browser."
            onFiles={open}
          />
        </div>
      </div>
    )
  }

  const { img } = opened
  const original = { width: img.width, height: img.height }
  const out = state.out
  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside
        aria-label="Image settings"
        className="flex max-h-[55%] w-full flex-none flex-col gap-4 overflow-y-auto border-b border-[var(--border)] bg-[var(--panel)] p-3 md:max-h-none md:w-80 md:border-r md:border-b-0"
      >
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
        <ResizeControls
          original={original}
          dims={dims}
          lock={edit.lockRatio}
          onDims={setDims}
          onLock={(lockRatio) => setEdit({ lockRatio })}
        />
        <FormatControls edit={edit} onChange={setEdit} />
        <TargetSizeControls target={edit.target} onChange={setTarget} />
        <ResultSummary
          img={img}
          dims={dims}
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
      <div className="min-h-0 min-w-0 flex-1">
        <PreviewArea
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
    </div>
  )
}
