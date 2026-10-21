import { useCallback, useEffect, useRef, useState } from 'react'
import { parsePageRange } from '../../../core/image/pageRange'
import { formatBytes } from '../../../core/image/size'
import { createZip } from '../../../core/image/zip'
import { useAppStore } from '../../../store/useAppStore'
import { downloadBlob } from '../../lib/files'
import { DropZone } from '../DropZone'
import { baseName, EXTENSION, encode, isLossy, LABEL, MIME, type OutFormat } from '../lib/canvas'
import { openPdf, type PdfDoc } from '../lib/pdfRender'
import { useImageStore } from '../useImageStore'
import { PageGrid, type RenderedPage } from './PageGrid'

const DPIS = [72, 96, 150, 200, 300]
const FORMATS: OutFormat[] = ['png', 'jpeg', 'webp']

interface Opened {
  name: string
  bytes: number
  doc: PdfDoc
}

/** Renders PDF pages to PNG / JPEG / WebP images at a chosen resolution. */
export function PdfToImages() {
  const prefs = useImageStore((s) => s.prefs.pdfToImages)
  const set = useImageStore((s) => s.setPdfToImages)
  const notify = useAppStore((s) => s.notify)
  const [opened, setOpened] = useState<Opened>()
  const [range, setRange] = useState('')
  const [pages, setPages] = useState<RenderedPage[]>([])
  const [progress, setProgress] = useState<string>()
  const run = useRef({ cancelled: false })

  useEffect(() => () => opened?.doc.destroy(), [opened])

  const open = useCallback(
    async (files: File[]) => {
      try {
        const file = files[0]
        const doc = await openPdf(await file.arrayBuffer())
        setOpened({ name: file.name, bytes: file.size, doc })
        setPages([])
        setRange('')
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Could not open the PDF')
      }
    },
    [notify],
  )

  const parsed = opened ? parsePageRange(range, opened.doc.pages) : { pages: [] as number[] }

  const convert = async () => {
    if (!opened || parsed.error) return
    const token = { cancelled: false }
    run.current.cancelled = true
    run.current = token
    setPages([])
    const out: RenderedPage[] = []
    try {
      for (const [i, n] of parsed.pages.entries()) {
        if (token.cancelled) return
        setProgress(`Rendering page ${n} (${i + 1} of ${parsed.pages.length})…`)
        const canvas = await opened.doc.render(n, prefs.dpi / 72)
        const blob = await encode(canvas, MIME[prefs.format], prefs.quality / 100)
        out.push({ page: n, blob, width: canvas.width, height: canvas.height })
        setPages([...out])
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Rendering failed')
    } finally {
      if (!token.cancelled) setProgress(undefined)
    }
  }

  const ext = EXTENSION[prefs.format]
  const fileName = (page: number) => `${baseName(opened?.name ?? 'pdf')}-page-${page}.${ext}`
  const downloadAll = async () => {
    const entries = await Promise.all(
      pages.map(async (p) => ({
        name: fileName(p.page),
        data: new Uint8Array(await p.blob.arrayBuffer()),
      })),
    )
    downloadBlob(
      new Blob([createZip(entries) as BlobPart], { type: 'application/zip' }),
      `${baseName(opened?.name ?? 'pdf')}-pages.zip`,
    )
  }

  if (!opened) {
    return (
      <div className="image-tool flex h-full items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <DropZone
            accept="application/pdf,.pdf"
            label="Choose a PDF or drop it here"
            hint="Each page becomes an image. The file stays in your browser."
            onFiles={open}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="image-tool flex h-full flex-col overflow-y-auto md:flex-row md:overflow-hidden">
      <aside
        aria-label="PDF settings"
        className="flex w-full flex-none flex-col gap-4 border-b border-[var(--border)] bg-[var(--panel)] p-3 md:h-full md:w-80 md:overflow-y-auto md:border-r md:border-b-0"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate font-medium" title={opened.name}>
              {opened.name}
            </div>
            <div className="text-[var(--muted)]">
              {opened.doc.pages} page{opened.doc.pages === 1 ? '' : 's'} ·{' '}
              {formatBytes(opened.bytes)}
            </div>
          </div>
          <button type="button" className="btn" onClick={() => setOpened(undefined)}>
            Change
          </button>
        </div>
        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="pane-title !px-0">Output</legend>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-14 flex-none text-[var(--muted)]">Format</span>
            <select
              className="input-sm"
              value={prefs.format}
              onChange={(e) => set({ format: e.target.value as OutFormat })}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {LABEL[f]}
                </option>
              ))}
            </select>
          </label>
          <label
            className="flex items-center gap-2 text-sm"
            title="Pixels per inch: higher is sharper and larger"
          >
            <span className="w-14 flex-none text-[var(--muted)]">Resolution</span>
            <select
              className="input-sm"
              value={prefs.dpi}
              onChange={(e) => set({ dpi: Number(e.target.value) })}
            >
              {DPIS.map((d) => (
                <option key={d} value={d}>
                  {d} dpi
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-14 flex-none text-[var(--muted)]">Quality</span>
            <input
              type="range"
              min={1}
              max={100}
              aria-label="Quality"
              disabled={!isLossy(prefs.format)}
              value={prefs.quality}
              className="min-w-0 flex-1"
              onChange={(e) => set({ quality: Number(e.target.value) })}
            />
            <span className="w-10 text-right tabular-nums">
              {isLossy(prefs.format) ? `${prefs.quality}%` : 'n/a'}
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-14 flex-none text-[var(--muted)]">Pages</span>
            <input
              className="input-sm min-w-0 flex-1"
              placeholder="all, or 1-3, 5"
              aria-label="Pages"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          </label>
          {parsed.error && <p className="text-xs text-[var(--error)]">{parsed.error}</p>}
        </fieldset>
        <button
          type="button"
          className="btn"
          disabled={!!parsed.error || progress !== undefined}
          onClick={convert}
        >
          Convert {parsed.pages.length} page{parsed.pages.length === 1 ? '' : 's'}
        </button>
        {progress && (
          <p role="status" className="text-sm text-[var(--muted)]">
            {progress}
          </p>
        )}
        <p className="text-xs text-[var(--muted)]">
          Text and vector pages render fully. Pages made only of JPEG 2000 or JBIG2 scans may come
          out blank, because the app never loads outside code.
        </p>
      </aside>
      <div className="min-w-0 flex-none md:min-h-0 md:flex-1 md:overflow-auto">
        <PageGrid pages={pages} fileName={fileName} ext={ext} onDownloadAll={downloadAll} />
      </div>
    </div>
  )
}
