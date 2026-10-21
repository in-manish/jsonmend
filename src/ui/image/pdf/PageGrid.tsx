import { formatBytes } from '../../../core/image/size'
import { downloadBlob } from '../../lib/files'
import { useObjectUrl } from '../lib/useObjectUrl'

export interface RenderedPage {
  page: number
  blob: Blob
  width: number
  height: number
}

function PageCard({ p, name }: { p: RenderedPage; name: string }) {
  const url = useObjectUrl(p.blob)
  return (
    <figure className="m-0 flex flex-col gap-1 rounded border border-[var(--border)] p-2">
      <div className="checkerboard flex h-48 items-center justify-center overflow-hidden">
        {url && (
          <img src={url} alt={`Page ${p.page}`} className="max-h-full max-w-full object-contain" />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--muted)]">
          Page {p.page} · {p.width}×{p.height} · {formatBytes(p.blob.size)}
        </span>
        <button type="button" className="btn" onClick={() => downloadBlob(p.blob, name)}>
          Download
        </button>
      </figcaption>
    </figure>
  )
}

/** Converted pages with per-page download and a ZIP of all of them. */
export function PageGrid({
  pages,
  fileName,
  ext,
  onDownloadAll,
}: {
  pages: RenderedPage[]
  fileName(page: number): string
  ext: string
  onDownloadAll(): void
}) {
  if (pages.length === 0) {
    return (
      <p className="p-4 text-sm text-[var(--muted)]">
        Pick the pages and settings, then Convert. Results appear here as {ext.toUpperCase()}{' '}
        images.
      </p>
    )
  }
  const total = pages.reduce((n, p) => n + p.blob.size, 0)
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--muted)]">
          {pages.length} image{pages.length === 1 ? '' : 's'} · {formatBytes(total)} total
        </span>
        <button type="button" className="btn" onClick={onDownloadAll}>
          Download all (ZIP)
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((p) => (
          <PageCard key={p.page} p={p} name={fileName(p.page)} />
        ))}
      </div>
    </div>
  )
}
