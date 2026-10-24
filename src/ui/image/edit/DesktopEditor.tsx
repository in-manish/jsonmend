import { formatBytes } from '../../../core/image/size'
import { openOption } from '../../navigation'
import { typeLabel } from '../lib/canvas'
import { ActionBar } from './ActionBar'
import { EditorControls } from './EditorControls'
import { PreviewArea } from './PreviewArea'
import type { EditorSession } from './useImageEditor'

/** Wide screens: settings sidebar on the left, a large preview on the right. */
export function DesktopEditor({ s }: { s: EditorSession }) {
  const { img } = s
  return (
    <div className="image-tool flex h-full flex-row">
      <aside
        aria-label="Image settings"
        className="flex w-80 flex-none flex-col border-r border-[var(--border)] bg-[var(--panel)]"
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
            <button type="button" className="btn" onClick={s.close}>
              Change
            </button>
          </div>
          <button type="button" className="btn w-full" onClick={() => openOption('image', 'form')}>
            Fit to a form (IBPS, NEET, UPSC, passport)
          </button>
          <EditorControls
            img={img}
            dims={s.dims}
            base={s.base}
            crop={s.crop}
            orient={s.orient}
            edit={s.edit}
            state={s.state}
            onDims={s.setDims}
            onOrient={s.changeOrient}
            onStartCrop={() => s.setView('crop')}
            onRemoveCrop={s.removeCrop}
            onEdit={s.setEdit}
            onTarget={s.setTarget}
          />
        </div>
        <ActionBar img={img} edit={s.edit} state={s.state} onDownload={s.download} />
      </aside>
      <div className="min-h-0 min-w-0 flex-1">
        <PreviewArea
          view={s.view}
          zoom={s.zoom}
          onView={s.setView}
          onZoom={s.setZoom}
          crop={s.cropView}
          original={{
            url: s.originalUrl,
            label: `Original · ${img.width}×${img.height} · ${formatBytes(img.bytes)}`,
            alt: 'Original image',
          }}
          result={{
            url: s.resultUrl,
            label: `Result · ${s.resultLabel}`,
            alt: 'Resized image preview',
          }}
        />
      </div>
    </div>
  )
}
