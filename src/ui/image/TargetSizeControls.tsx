import type { SizeUnit } from '../../core/image/size'
import { NumField } from './NumField'
import type { TargetPrefs } from './useImageStore'

interface Props {
  target: TargetPrefs
  onChange(patch: Partial<TargetPrefs>): void
  /** Wording for what shrinks, e.g. "image" or "PDF". */
  what?: string
}

/** "Limit file size" with a number and a KB / MB unit (KB by default). */
export function TargetSizeControls({ target, onChange, what = 'image' }: Props) {
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="pane-title !px-0">File size limit</legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={target.on}
          onChange={(e) => onChange({ on: e.target.checked })}
        />
        Compress the {what} to a target size
      </label>
      <div className="flex items-center gap-1">
        <NumField
          label="Target"
          value={target.value}
          min={0.01}
          step={target.unit === 'mb' ? 0.1 : 10}
          disabled={!target.on}
          onCommit={(value) => onChange({ value })}
        />
        <select
          className="input-sm"
          aria-label="Size unit"
          value={target.unit}
          disabled={!target.on}
          onChange={(e) => onChange({ unit: e.target.value as SizeUnit })}
        >
          <option value="kb">KB</option>
          <option value="mb">MB</option>
        </select>
      </div>
      <label
        className="flex items-center gap-2 text-sm"
        title="If quality alone cannot reach the target, shrink the pixel dimensions too"
      >
        <input
          type="checkbox"
          checked={target.allowScale}
          disabled={!target.on}
          onChange={(e) => onChange({ allowScale: e.target.checked })}
        />
        Reduce dimensions if needed
      </label>
    </fieldset>
  )
}
