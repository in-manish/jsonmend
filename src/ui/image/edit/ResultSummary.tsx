import type { Dim } from '../../../core/image/dims'
import { estimateBytes } from '../../../core/image/dims'
import { formatBytes, toBytes } from '../../../core/image/size'
import type { Loaded } from '../lib/canvas'
import { LABEL, typeLabel } from '../lib/canvas'
import type { ImagePrefs } from '../useImageStore'
import type { EncodeState } from './useEncode'

interface Props {
  img: Loaded
  dims: Dim
  edit: ImagePrefs['edit']
  state: EncodeState
}

const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-[var(--muted)]">{k}</dt>
    <dd className={`text-right tabular-nums ${strong ? 'font-semibold' : ''}`}>{v}</dd>
  </div>
)

/** Original vs result: dimensions, calculated file size, saving, and whether the limit was met. */
export function ResultSummary({ img, dims, edit, state }: Props) {
  const { out } = state
  const working = state.status === 'working'
  const original = { width: img.width, height: img.height }
  const estimate = estimateBytes(img.bytes, original, dims)
  const target = edit.target
  const targetBytes = toBytes(target.value, target.unit)
  const saved = out ? Math.round((1 - out.blob.size / img.bytes) * 100) : undefined

  return (
    <section aria-label="Result" className="flex flex-col gap-2">
      <dl className="flex flex-col gap-0.5 text-sm">
        <Row
          k="Original"
          v={`${img.width}×${img.height} · ${formatBytes(img.bytes)} · ${typeLabel(img.type)}`}
        />
        <Row
          k="Result"
          v={
            out
              ? `${out.width}×${out.height} · ${LABEL[edit.format]}`
              : `${dims.width}×${dims.height} · ${LABEL[edit.format]}`
          }
        />
        <Row
          k="Calculated size"
          strong
          v={
            out && !working
              ? formatBytes(out.blob.size)
              : `${out ? formatBytes(out.blob.size) : `~${formatBytes(estimate)}`}${working ? ' (updating…)' : ''}`
          }
        />
        {saved !== undefined && !working && (
          <Row k={saved >= 0 ? 'Smaller by' : 'Larger by'} v={`${Math.abs(saved)}%`} />
        )}
        {out && target.on && edit.format !== 'png' && (
          <Row k="Quality used" v={`${Math.round(out.quality * 100)}%`} />
        )}
        {out && out.scale < 1 && (
          <Row k="Dimensions reduced to" v={`${Math.round(out.scale * 100)}% of chosen`} />
        )}
      </dl>
      {target.on && out && !working && (
        <p
          className="text-sm"
          role="status"
          style={{ color: out.met ? 'var(--info)' : 'var(--error)' }}
        >
          {out.met
            ? `Done: ${formatBytes(out.blob.size)}, under your ${formatBytes(targetBytes)} limit.`
            : `Could not get under ${formatBytes(targetBytes)}: the smallest was ${formatBytes(out.blob.size)}.${
                target.allowScale
                  ? ' Try a smaller size in Resize, or save as WebP or JPG.'
                  : ' Allow making the photo smaller in File size.'
              }`}
        </p>
      )}
      {state.status === 'error' && <p className="text-sm text-[var(--error)]">{state.error}</p>}
    </section>
  )
}
