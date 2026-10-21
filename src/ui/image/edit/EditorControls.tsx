import type { Rect } from '../../../core/image/crop'
import type { Dim } from '../../../core/image/dims'
import { describe, type Orientation } from '../../../core/image/orient'
import { formatBytes, toBytes } from '../../../core/image/size'
import { LABEL, type Loaded } from '../lib/canvas'
import { Section } from '../Section'
import { TargetSizeControls } from '../TargetSizeControls'
import type { ImagePrefs, TargetPrefs } from '../useImageStore'
import { FormatControls } from './FormatControls'
import { OrientationControls } from './OrientationControls'
import { ResizeControls } from './ResizeControls'
import { ResultSummary } from './ResultSummary'
import type { EncodeState } from './useEncode'

interface Props {
  img: Loaded
  /** Size of the output: what the Resize fields show. */
  dims: Dim
  /** Size the resize fields are relative to: the cropped and turned picture. */
  base: Dim
  crop: Rect | undefined
  orient: Orientation
  edit: ImagePrefs['edit']
  state: EncodeState
  onDims(d: Dim): void
  onOrient(o: Orientation): void
  onStartCrop(): void
  onRemoveCrop(): void
  onEdit(patch: Partial<ImagePrefs['edit']>): void
  onTarget(patch: Partial<TargetPrefs>): void
}

/** The collapsible control groups of the image editor. */
export function EditorControls(p: Props) {
  const { img, dims, base, crop, orient, edit, state } = p
  const out = state.out
  return (
    <>
      <Section title="Crop" openOnPhone summary={crop ? `${crop.w}×${crop.h} px` : 'Whole image'}>
        <p className="text-sm text-[var(--muted)]">
          {crop
            ? `Keeping ${crop.w}×${crop.h} px of the original.`
            : 'Tap the image above, or the button below, then drag to choose the part to keep.'}
        </p>
        <div className="flex flex-wrap gap-1">
          <button type="button" className="btn" onClick={p.onStartCrop}>
            {crop ? 'Adjust crop' : 'Crop image'}
          </button>
          {crop && (
            <button type="button" className="btn" onClick={p.onRemoveCrop}>
              Remove crop
            </button>
          )}
        </div>
      </Section>

      <Section title="Orientation" openOnPhone summary={describe(orient)}>
        <OrientationControls orient={orient} onChange={p.onOrient} />
      </Section>

      <Section title="Resize" openOnPhone summary={`${dims.width}×${dims.height} px`}>
        <ResizeControls
          original={base}
          dims={dims}
          lock={edit.lockRatio}
          unit={edit.unit}
          dpi={edit.dpi}
          onDims={p.onDims}
          onLock={(lockRatio) => p.onEdit({ lockRatio })}
          onUnit={(unit) => p.onEdit({ unit })}
          onDpi={(dpi) => p.onEdit({ dpi })}
        />
      </Section>

      <Section
        title="Save as"
        summary={`${LABEL[edit.format]}${edit.format === 'png' ? '' : ` · ${edit.quality}%`}`}
      >
        <FormatControls edit={edit} onChange={p.onEdit} />
      </Section>

      <Section
        title="File size"
        summary={
          edit.target.on
            ? `Under ${formatBytes(toBytes(edit.target.value, edit.target.unit))}`
            : 'No limit'
        }
      >
        <TargetSizeControls target={edit.target} onChange={p.onTarget} originalBytes={img.bytes} />
      </Section>

      <Section title="Info" summary={out ? formatBytes(out.blob.size) : '…'}>
        <ResultSummary img={img} dims={dims} edit={edit} state={state} />
      </Section>
    </>
  )
}
