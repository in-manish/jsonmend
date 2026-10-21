import type { PreviewPrefs } from '../useHtmlStore'
import { DEVICES, FIT } from './devices'

interface Props {
  prefs: PreviewPrefs
  onChange(patch: Partial<PreviewPrefs>): void
  /** The source has Django / Jinja syntax to fill. */
  canFill: boolean
}

export function PreviewToolbar({ prefs, onChange, canFill }: Props) {
  const fit = prefs.device === FIT
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 [&>*]:shrink-0">
      <label
        className="flex items-center gap-1 text-sm"
        title="Renders the Django / Jinja template with sample data inferred from its variables"
      >
        <input
          type="checkbox"
          checked={prefs.fill}
          disabled={!canFill}
          onChange={(e) => onChange({ fill: e.target.checked })}
        />
        Fill sample data
      </label>
      <label className="flex items-center gap-1 text-sm">
        Device
        <select
          className="input-sm"
          value={prefs.device}
          onChange={(e) => onChange({ device: e.target.value })}
        >
          <option value={FIT}>Fill pane</option>
          {(['phone', 'tablet', 'desktop'] as const).map((kind) => (
            <optgroup key={kind} label={kind[0].toUpperCase() + kind.slice(1)}>
              {DEVICES.filter((d) => d.kind === kind).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn"
        disabled={fit}
        aria-pressed={prefs.landscape}
        onClick={() => onChange({ landscape: !prefs.landscape })}
        title="Rotate the device"
      >
        Rotate
      </button>
      <label
        className="flex items-center gap-1 text-sm"
        title="Shows the HTML the way Gmail would: strips what Gmail strips and lists each change"
      >
        Email client
        <select
          className="input-sm"
          value={prefs.gmail}
          onChange={(e) => onChange({ gmail: e.target.value as PreviewPrefs['gmail'] })}
        >
          <option value="off">None (browser)</option>
          <option value="gmail">Gmail (Google account)</option>
          <option value="other">Gmail app (other account)</option>
        </select>
      </label>
      <label
        className="flex items-center gap-1 text-sm"
        title="Approximates Gmail's dark mode by inverting the message"
      >
        <input
          type="checkbox"
          checked={prefs.dark}
          disabled={prefs.gmail === 'off'}
          onChange={(e) => onChange({ dark: e.target.checked })}
        />
        Dark mode
      </label>
    </div>
  )
}
