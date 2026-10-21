import { useCallback, useMemo, useRef, useState } from 'react'
import type { PageSize } from '../../../core/image/pdfWriter'
import { formatBytes, toBytes } from '../../../core/image/size'
import { useAppStore } from '../../../store/useAppStore'
import { downloadBlob } from '../../lib/files'
import { DropZone } from '../DropZone'
import { type Loaded, loadImage } from '../lib/canvas'
import { TargetSizeControls } from '../TargetSizeControls'
import { useImageStore } from '../useImageStore'
import { PageList, type PdfItem } from './PageList'
import { useBuildPdf } from './useBuildPdf'

const MARGINS = [
  { pt: 0, label: 'None' },
  { pt: 14, label: 'Small (5 mm)' },
  { pt: 28, label: 'Medium (10 mm)' },
  { pt: 57, label: 'Large (20 mm)' },
]

/** Combine images into one PDF: order, page size, margin, quality and an optional size limit. */
export function ImagesToPdf() {
  const prefs = useImageStore((s) => s.prefs.imagesToPdf)
  const set = useImageStore((s) => s.setImagesToPdf)
  const setTarget = useImageStore((s) => s.setPdfTarget)
  const notify = useAppStore((s) => s.notify)
  const [items, setItems] = useState<PdfItem[]>([])
  const [decoded, setDecoded] = useState<Map<number, Loaded>>(new Map())
  const nextId = useRef(1)

  const add = useCallback(
    async (files: File[]) => {
      const added: { item: PdfItem; img: Loaded }[] = []
      for (const file of files) {
        try {
          const img = await loadImage(file)
          added.push({
            item: { id: nextId.current++, file, width: img.width, height: img.height },
            img,
          })
        } catch (err) {
          notify(err instanceof Error ? err.message : `Could not read ${file.name}`)
        }
      }
      if (!added.length) return
      setItems((cur) => [...cur, ...added.map((a) => a.item)])
      setDecoded((cur) => new Map([...cur, ...added.map((a) => [a.item.id, a.img] as const)]))
    },
    [notify],
  )

  const images = useMemo(
    () => items.map((i) => decoded.get(i.id)).filter((x): x is Loaded => !!x),
    [items, decoded],
  )
  const state = useBuildPdf(images, prefs)
  const options = { size: prefs.size, margin: prefs.margin, orientation: prefs.orientation }
  const { out } = state
  const working = state.status === 'working'
  const targetBytes = toBytes(prefs.target.value, prefs.target.unit)

  const move = (index: number, delta: -1 | 1) =>
    setItems((cur) => {
      const next = [...cur]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <DropZone
            multiple
            paste
            accept="image/*"
            label="Choose images, drop them here, or paste"
            hint="Each image becomes one PDF page, in the order you set. Nothing is uploaded."
            onFiles={add}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside
        aria-label="PDF settings"
        className="flex max-h-[55%] w-full flex-none flex-col gap-4 overflow-y-auto border-b border-[var(--border)] bg-[var(--panel)] p-3 md:max-h-none md:w-80 md:border-r md:border-b-0"
      >
        <DropZone
          compact
          multiple
          paste
          accept="image/*"
          label="Add more images"
          hint="or drop / paste"
          onFiles={add}
        />
        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="pane-title !px-0">Page</legend>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-14 flex-none text-[var(--muted)]">Size</span>
            <select
              className="input-sm"
              value={prefs.size}
              onChange={(e) => set({ size: e.target.value as PageSize })}
            >
              <option value="fit">Fit to image</option>
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-14 flex-none text-[var(--muted)]">Layout</span>
            <select
              className="input-sm"
              value={prefs.orientation}
              disabled={prefs.size === 'fit'}
              onChange={(e) => set({ orientation: e.target.value as 'auto' | 'portrait' })}
            >
              <option value="auto">Landscape for wide images</option>
              <option value="portrait">Always portrait</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-14 flex-none text-[var(--muted)]">Margin</span>
            <select
              className="input-sm"
              value={prefs.margin}
              onChange={(e) => set({ margin: Number(e.target.value) })}
            >
              {MARGINS.map((m) => (
                <option key={m.pt} value={m.pt}>
                  {m.label}
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
              value={prefs.quality}
              className="min-w-0 flex-1"
              onChange={(e) => set({ quality: Number(e.target.value) })}
            />
            <span className="w-10 text-right tabular-nums">{prefs.quality}%</span>
          </label>
        </fieldset>
        <TargetSizeControls target={prefs.target} onChange={setTarget} what="PDF" />
        <section aria-label="Result" className="flex flex-col gap-2">
          <h3 className="pane-title !px-0">Result</h3>
          <dl className="flex flex-col gap-0.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Pages</dt>
              <dd>{items.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Calculated size</dt>
              <dd className="font-semibold tabular-nums">
                {out ? formatBytes(out.blob.size) : '…'}
                {working ? ' (updating…)' : ''}
              </dd>
            </div>
            {out && out.scale < 1 && (
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Images reduced to</dt>
                <dd>{Math.round(out.scale * 100)}%</dd>
              </div>
            )}
          </dl>
          {prefs.target.on && out && !working && (
            <p
              className="text-sm"
              role="status"
              style={{ color: out.met ? 'var(--info)' : 'var(--error)' }}
            >
              {out.met
                ? `Within the ${formatBytes(targetBytes)} target.`
                : `Could not reach ${formatBytes(targetBytes)}: smallest is ${formatBytes(out.blob.size)}.`}
            </p>
          )}
          {state.status === 'error' && <p className="text-sm text-[var(--error)]">{state.error}</p>}
          <button
            type="button"
            className="btn"
            disabled={!out || working}
            onClick={() => out && downloadBlob(out.blob, 'images.pdf')}
          >
            Download PDF
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setItems([])
              setDecoded(new Map())
            }}
          >
            Clear all
          </button>
        </section>
      </aside>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        <PageList
          items={items}
          options={options}
          onMove={move}
          onRemove={(id) => setItems((cur) => cur.filter((i) => i.id !== id))}
        />
      </div>
    </div>
  )
}
