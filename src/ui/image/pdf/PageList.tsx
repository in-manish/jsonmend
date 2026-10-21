import type { PdfOptions } from '../../../core/image/pdfWriter'
import { pageGeometry } from '../../../core/image/pdfWriter'
import { formatBytes } from '../../../core/image/size'
import { useObjectUrl } from '../lib/useObjectUrl'

export interface PdfItem {
  id: number
  file: File
  width: number
  height: number
}

/** A page-shaped preview of where the image lands on the PDF page. */
function PageThumb({ item, options }: { item: PdfItem; options: PdfOptions }) {
  const url = useObjectUrl(item.file)
  const g = pageGeometry(
    { jpeg: new Uint8Array(), width: item.width, height: item.height },
    options,
  )
  return (
    <div
      className="relative flex-none bg-white shadow ring-1 ring-black/10"
      style={{ width: 56, height: 56 * (g.ph / g.pw), maxHeight: 80 }}
    >
      {url && (
        <img
          src={url}
          alt=""
          className="absolute"
          style={{
            left: `${(g.x / g.pw) * 100}%`,
            top: `${(g.y / g.ph) * 100}%`,
            width: `${(g.w / g.pw) * 100}%`,
            height: `${(g.h / g.ph) * 100}%`,
          }}
        />
      )}
    </div>
  )
}

interface Props {
  items: PdfItem[]
  options: PdfOptions
  onMove(index: number, delta: -1 | 1): void
  onRemove(id: number): void
}

/** Pages in order, each with a layout preview and move / remove buttons. */
export function PageList({ items, options, onMove, onRemove }: Props) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-3">
      {items.map((item, i) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded border border-[var(--border)] p-2"
        >
          <span className="w-6 text-center text-sm tabular-nums text-[var(--muted)]">{i + 1}</span>
          <PageThumb item={item} options={options} />
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate" title={item.file.name}>
              {item.file.name}
            </div>
            <div className="text-xs text-[var(--muted)]">
              {item.width}×{item.height} · {formatBytes(item.file.size)}
            </div>
          </div>
          <button
            type="button"
            className="btn"
            disabled={i === 0}
            aria-label={`Move ${item.file.name} up`}
            onClick={() => onMove(i, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn"
            disabled={i === items.length - 1}
            aria-label={`Move ${item.file.name} down`}
            onClick={() => onMove(i, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn"
            aria-label={`Remove ${item.file.name}`}
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </li>
      ))}
    </ol>
  )
}
