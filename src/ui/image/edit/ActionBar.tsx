import { formatBytes, toBytes } from '../../../core/image/size'
import { LABEL, type Loaded } from '../lib/canvas'
import type { ImagePrefs } from '../useImageStore'
import type { EncodeState } from './useEncode'

interface Props {
  img: Loaded
  edit: ImagePrefs['edit']
  state: EncodeState
  onDownload(): void
}

/** Always-visible result line and Download button; sticks to the bottom of the controls. */
export function ActionBar({ img, edit, state, onDownload }: Props) {
  const { out } = state
  const working = state.status === 'working'
  const saved = out ? Math.round((1 - out.blob.size / img.bytes) * 100) : undefined
  const target = edit.target

  return (
    <div className="flex flex-none flex-col gap-1.5 border-t border-[var(--border)] bg-[var(--panel)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-baseline justify-between gap-2 text-sm" role="status">
        <span className="tabular-nums" data-testid="action-size">
          {out ? `${out.width}×${out.height} · ${formatBytes(out.blob.size)}` : 'Calculating…'}
          {working && out ? ' · updating…' : ''}
        </span>
        <span className="text-xs text-[var(--muted)]">
          {saved !== undefined && !working
            ? `${Math.abs(saved)}% ${saved >= 0 ? 'smaller' : 'larger'}`
            : ''}
        </span>
      </div>
      {target.on && out && !working && (
        <p className="text-xs" style={{ color: out.met ? 'var(--info)' : 'var(--error)' }}>
          {out.met
            ? `Within ${formatBytes(toBytes(target.value, target.unit))}`
            : `Over ${formatBytes(toBytes(target.value, target.unit))}: see Result details`}
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary"
        disabled={!out || working}
        onClick={onDownload}
      >
        Download {LABEL[edit.format]}
      </button>
    </div>
  )
}
