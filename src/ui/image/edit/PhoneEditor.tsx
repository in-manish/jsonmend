import { useState } from 'react'
import { formatBytes } from '../../../core/image/size'
import { typeLabel } from '../lib/canvas'
import { TargetSizeControls } from '../TargetSizeControls'
import { ActionBar } from './ActionBar'
import { CropView } from './CropView'
import { FirstTip } from './FirstTip'
import { FormatControls } from './FormatControls'
import { OrientationControls } from './OrientationControls'
import { PhonePreview } from './PhonePreview'
import { type PhoneTool, PhoneToolbar, TOOL_LABELS } from './PhoneToolbar'
import { ResizeControls } from './ResizeControls'
import { ResultSummary } from './ResultSummary'
import type { EditorSession } from './useImageEditor'

/**
 * Phones, laid out like a photo editor: the picture fills the screen, a tool bar sits at the
 * bottom, and each tool opens its own small panel above the result line and Download button.
 */
export function PhoneEditor({ s }: { s: EditorSession }) {
  const [tool, setTool] = useState<PhoneTool>()
  const { img, edit } = s

  if (s.view === 'crop') {
    return (
      <div className="image-tool flex h-full flex-col">
        <CropView
          key={s.cropView.key}
          compact
          src={s.cropView.src}
          width={s.cropView.width}
          height={s.cropView.height}
          applied={s.cropView.applied}
          onApply={(r) => {
            s.cropView.onApply(r)
            s.setView('result')
          }}
          onCancel={() => s.setView('result')}
        />
      </div>
    )
  }

  const pick = (t: PhoneTool) => {
    if (t === 'crop') return s.setView('crop')
    setTool(tool === t ? undefined : t)
  }

  const panel: Record<Exclude<PhoneTool, 'crop'>, React.ReactNode> = {
    rotate: <OrientationControls orient={s.orient} onChange={s.changeOrient} />,
    resize: (
      <ResizeControls
        original={s.base}
        dims={s.dims}
        lock={edit.lockRatio}
        unit={edit.unit}
        dpi={edit.dpi}
        onDims={s.setDims}
        onLock={(lockRatio) => s.setEdit({ lockRatio })}
        onUnit={(unit) => s.setEdit({ unit })}
        onDpi={(dpi) => s.setEdit({ dpi })}
      />
    ),
    format: <FormatControls edit={edit} onChange={s.setEdit} />,
    size: (
      <TargetSizeControls target={edit.target} onChange={s.setTarget} originalBytes={img.bytes} />
    ),
    info: (
      <>
        <div className="text-sm">
          <div className="truncate font-medium">{img.name}</div>
          <div className="text-[var(--muted)]">
            {typeLabel(img.type)} · {img.width}×{img.height} · {formatBytes(img.bytes)}
          </div>
        </div>
        <ResultSummary img={img} dims={s.dims} edit={edit} state={s.state} />
        {s.crop && (
          <button type="button" className="btn" onClick={s.removeCrop}>
            Remove crop ({s.crop.w}×{s.crop.h})
          </button>
        )}
        <button type="button" className="btn" onClick={s.close}>
          Choose another image
        </button>
      </>
    ),
  }

  return (
    <div className="image-tool flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <PhonePreview s={s} bare={tool !== undefined} />
      </div>
      {tool && tool !== 'crop' && (
        <section
          aria-label={TOOL_LABELS[tool]}
          className="flex max-h-[48dvh] flex-none flex-col border-t border-[var(--border)] bg-[var(--panel)]"
        >
          <div className="flex items-center justify-between gap-2 px-3 pt-2">
            <h2 className="text-sm font-semibold">{TOOL_LABELS[tool]}</h2>
            <button
              type="button"
              className="px-2 py-2 text-sm font-medium text-[var(--accent)]"
              onClick={() => setTool(undefined)}
            >
              Done
            </button>
          </div>
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3 pt-2">{panel[tool]}</div>
        </section>
      )}
      {!tool && <FirstTip />}
      <ActionBar compact img={img} edit={edit} state={s.state} onDownload={s.download} />
      <PhoneToolbar active={tool} onPick={pick} />
    </div>
  )
}
