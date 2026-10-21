import { formatBytes, toBytes } from '../../../core/image/size'
import { LABEL, type Loaded } from '../lib/canvas'
import type { ImagePrefs } from '../useImageStore'
import type { EncodeState } from './useEncode'

interface Props {
  img: Loaded
  edit: ImagePrefs['edit']
  state: EncodeState
  onDownload(): void
  /** One row (phones): result on the left, Download on the right. */
  compact?: boolean
}

/** Always-visible result line and Download button. */
export function ActionBar({ img, edit, state, onDownload, compact }: Props) {
  const { out } = state
  const working = state.status === 'working'
  const saved = out ? Math.round((1 - out.blob.size / img.bytes) * 100) : undefined
  const target = edit.target
  const limit = formatBytes(toBytes(target.value, target.unit))

  const size = (
    <span className="tabular-nums" data-testid="action-size">
      {out ? `${out.width}×${out.height} · ${formatBytes(out.blob.size)}` : 'Calculating…'}
      {working && out ? ' · updating…' : ''}
    </span>
  )
  const change =
    saved !== undefined && !working
      ? `${Math.abs(saved)}% ${saved >= 0 ? 'smaller' : 'larger'}`
      : ''
  const targetNote =
    target.on && out && !working ? (
      <span style={{ color: out.met ? 'var(--info)' : 'var(--error)' }}>
        {out.met ? `Under ${limit} ✓` : `Still over ${limit}`}
      </span>
    ) : null
  const button = (
    <button
      type="button"
      className={`btn btn-primary ${compact ? 'flex-none px-5' : ''}`}
      disabled={!out || working}
      onClick={onDownload}
    >
      {compact ? 'Download' : `Download ${LABEL[edit.format]}`}
    </button>
  )

  if (compact) {
    return (
      <div className="flex flex-none items-center gap-3 border-t border-[var(--border)] bg-[var(--panel)] px-3 py-2">
        <div className="min-w-0 flex-1 text-sm leading-tight" role="status">
          <div className="truncate font-medium">{size}</div>
          <div className="truncate text-xs text-[var(--muted)]">
            {LABEL[edit.format]}
            {change && ` · ${change}`}
            {targetNote && ' · '}
            {targetNote}
          </div>
        </div>
        {button}
      </div>
    )
  }

  return (
    <div className="flex flex-none flex-col gap-1.5 border-t border-[var(--border)] bg-[var(--panel)] p-3">
      <div className="flex items-baseline justify-between gap-2 text-sm" role="status">
        {size}
        <span className="text-xs text-[var(--muted)]">{change}</span>
      </div>
      {targetNote && <p className="text-xs">{targetNote}</p>}
      {button}
    </div>
  )
}
