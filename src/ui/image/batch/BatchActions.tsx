import { savedPercent } from '../../../core/image/batch'
import { formatBytes } from '../../../core/image/size'
import type { BatchItem } from './useBatch'
import { MAX_ZIP_BYTES } from './zipResults'

interface Props {
  items: BatchItem[]
  running: boolean
  stale: boolean
  /** The Convert button's wording for the chosen goal, e.g. "Make 3 photos smaller". */
  action: string
  onConvert(): void
  onStop(): void
  onZip(): void
}

/** Bottom bar: progress or result summary, Convert / Stop, and Download all. */
export function BatchActions({ items, running, stale, action, onConvert, onStop, onZip }: Props) {
  const done = items.filter((i) => i.out)
  const failed = items.filter((i) => i.status === 'error').length
  const before = done.reduce((n, i) => n + i.file.size, 0)
  const after = done.reduce((n, i) => n + (i.out?.blob.size ?? 0), 0)
  const saved = savedPercent(before, after)
  const tooBig = after > MAX_ZIP_BYTES

  const plural = (n: number) => `${n} photo${n === 1 ? '' : 's'}`
  const status = running
    ? `Working on photo ${Math.min(done.length + failed + 1, items.length)} of ${items.length}…`
    : done.length === 0
      ? `${plural(items.length)} added. Pick what you need, then press the blue button.`
      : `✓ ${plural(done.length)} ready · ${formatBytes(before)} → ${formatBytes(after)}${
          saved ? ` (${saved}% smaller)` : ''
        }${failed ? ` · ${failed} skipped` : ''}`

  return (
    <div className="flex flex-none flex-col gap-1.5 border-t border-[var(--border)] bg-[var(--panel)] px-3 py-2">
      <div className="text-sm" role="status" data-testid="batch-status">
        {status}
        {stale && !running && (
          <span className="text-[var(--muted)]">
            {' '}
            · you changed a choice, press the blue button again
          </span>
        )}
      </div>
      {!running && done.length > 0 && (
        <p className="text-xs text-[var(--muted)]">
          A ZIP is one file that holds all your photos. Open it to get them back.
        </p>
      )}
      {tooBig && (
        <p className="text-xs text-[var(--error)]">
          Too much for one ZIP file ({formatBytes(after)}). Download the photos one by one, or do
          fewer at a time.
        </p>
      )}
      <div className="flex gap-2">
        {running ? (
          <button type="button" className="btn flex-1" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn btn-primary flex-1" onClick={onConvert}>
            {done.length ? 'Start again' : action}
          </button>
        )}
        {done.length > 0 && (
          <button type="button" className="btn flex-1" disabled={running || tooBig} onClick={onZip}>
            Download all (ZIP)
          </button>
        )}
      </div>
    </div>
  )
}
