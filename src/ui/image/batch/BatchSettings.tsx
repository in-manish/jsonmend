import { formatBytes, toBytes } from '../../../core/image/size'
import { FormatControls } from '../edit/FormatControls'
import { DPIS } from '../edit/ResizeControls'
import { isLossy, LABEL } from '../lib/canvas'
import { Section } from '../Section'
import { TargetSizeControls } from '../TargetSizeControls'
import { type ImagePrefs, type TargetPrefs, useImageStore } from '../useImageStore'
import { BatchSize, sizeSummary } from './BatchSize'

const limitText = (t: TargetPrefs) =>
  t.on ? `Under ${formatBytes(toBytes(t.value, t.unit))}` : 'No limit'

/** Settings applied to every photo in the list: size, file type and quality, file size limit. */
export function BatchSettings({ prefs }: { prefs: ImagePrefs['batch'] }) {
  const set = useImageStore((s) => s.setBatch)
  const setTarget = useImageStore((s) => s.setBatchTarget)
  return (
    <div className="flex flex-col gap-2">
      <Section title="Size" summary={sizeSummary(prefs)}>
        <BatchSize prefs={prefs} onChange={set} />
        <label className="flex items-center gap-2 text-sm">
          <span className="flex-none text-[var(--muted)]">DPI</span>
          <select
            className="input-sm min-w-0 flex-1"
            aria-label="Print resolution"
            value={prefs.dpi}
            onChange={(e) => set({ dpi: Number(e.target.value) })}
          >
            {DPIS.map((d) => (
              <option key={d.dpi} value={d.dpi}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </Section>
      <Section
        title="Save as"
        summary={`${LABEL[prefs.format]}${isLossy(prefs.format) ? ` · ${prefs.quality}%` : ''}`}
      >
        <FormatControls edit={prefs} onChange={set} />
      </Section>
      <Section title="File size" summary={limitText(prefs.target)}>
        <TargetSizeControls target={prefs.target} onChange={setTarget} />
      </Section>
    </div>
  )
}
