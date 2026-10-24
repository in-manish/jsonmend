import { savedPercent } from '../../../core/image/batch'
import { formatBytes, toBytes } from '../../../core/image/size'
import { downloadBlob } from '../../lib/files'
import type { OutFormat } from '../lib/canvas'
import type { TargetPrefs } from '../useImageStore'
import { Thumb } from './Thumb'
import type { BatchItem } from './useBatch'
import { outputName } from './zipResults'

interface Props {
  items: BatchItem[]
  format: OutFormat
  target: TargetPrefs
  busy: boolean
  onRemove(id: number): void
  /** Open the larger look at one photo. */
  onOpen(id: number): void
}

function Detail({ item, target }: { item: BatchItem; target: TargetPrefs }) {
  const before = formatBytes(item.file.size)
  if (item.status === 'error') {
    return <span className="text-[var(--error)]">{item.error}</span>
  }
  if (item.status === 'working') return <span>Working…</span>
  if (!item.out) return <span>{before} · waiting</span>
  const { out } = item
  const saved = savedPercent(item.file.size, out.blob.size)
  return (
    <span>
      {before} → {out.width}×{out.height} · {formatBytes(out.blob.size)}
      {saved !== undefined && saved > 0 && ` (${saved}% smaller)`}
      {out.met === false && (
        <span className="text-[var(--error)]">
          {' '}
          · could not get under {formatBytes(toBytes(target.value, target.unit))}
        </span>
      )}
    </span>
  )
}

/** One row per photo: what it is, what it became, and per-photo download and remove. */
export function BatchList({ items, format, target, busy, onRemove, onOpen }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border)] p-0">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 px-3 py-2" data-status={item.status}>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent p-0 text-left text-inherit"
            aria-label={`Preview ${item.file.name}`}
            title="Tap to see the photo bigger"
            onClick={() => onOpen(item.id)}
          >
            <Thumb file={item.file} />
            <span className="min-w-0 flex-1 text-sm leading-snug">
              <span className="block truncate font-medium">{item.file.name}</span>
              <span className="block truncate text-xs text-[var(--muted)]">
                <Detail item={item} target={target} />
              </span>
            </span>
          </button>
          {item.out && (
            <button
              type="button"
              className="btn flex-none"
              aria-label={`Download ${outputName(item.file, format)}`}
              onClick={() => downloadBlob(item.out?.blob as Blob, outputName(item.file, format))}
            >
              Download
            </button>
          )}
          <button
            type="button"
            className="btn flex-none"
            aria-label={`Remove ${item.file.name}`}
            title="Remove from the list"
            disabled={busy}
            onClick={() => onRemove(item.id)}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}
