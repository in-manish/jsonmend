import type { HtmlOptions } from '../../core/html/format'
import { HTML_SAMPLES } from './samples'

interface Props {
  options: HtmlOptions
  hasInput: boolean
  hasOutput: boolean
  onOptions(patch: Partial<HtmlOptions>): void
  onPaste(): void
  onClear(): void
  onUseFormatted(): void
  onCopy(): void
  onDownload(): void
  onSample(text: string): void
}

export function HtmlToolbar(p: Props) {
  const { options } = p
  return (
    <header className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 md:flex-wrap [&>*]:shrink-0">
      <label className="flex items-center gap-1 text-sm">
        Indent
        <select
          className="input-sm"
          value={String(options.indent)}
          onChange={(e) =>
            p.onOptions({
              indent: e.target.value === 'tab' ? 'tab' : e.target.value === '4' ? 4 : 2,
            })
          }
        >
          <option value="2">2 spaces</option>
          <option value="4">4 spaces</option>
          <option value="tab">Tab</option>
        </select>
      </label>
      <label
        className="flex items-center gap-1 text-sm"
        title="Text and long tags wrap at this width"
      >
        Width
        <select
          className="input-sm"
          value={options.width}
          onChange={(e) => p.onOptions({ width: Number(e.target.value) })}
        >
          {[80, 100, 120, 160].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label
        className="flex items-center gap-1 text-sm"
        title="Keeps {{ }}, {% %} and {# #} intact, checks them, and suggests fixes. Auto turns on when the input contains them."
      >
        Django / Jinja
        <select
          className="input-sm"
          value={options.template}
          onChange={(e) => p.onOptions({ template: e.target.value as HtmlOptions['template'] })}
        >
          <option value="auto">Auto</option>
          <option value="on">On</option>
          <option value="off">Off</option>
        </select>
      </label>
      <button type="button" className="btn" onClick={p.onPaste}>
        Paste
      </button>
      <button type="button" className="btn" disabled={!p.hasInput} onClick={p.onClear}>
        Clear
      </button>
      <button
        type="button"
        className="btn"
        disabled={!p.hasOutput}
        onClick={p.onUseFormatted}
        title="Replace the input with the formatted HTML"
      >
        Use formatted as input
      </button>
      <button type="button" className="btn" disabled={!p.hasOutput} onClick={p.onCopy}>
        Copy
      </button>
      <button type="button" className="btn" disabled={!p.hasOutput} onClick={p.onDownload}>
        Download .html
      </button>
      <select
        className="input-sm"
        aria-label="Samples"
        value=""
        onChange={(e) => {
          const sample = HTML_SAMPLES.find((x) => x.id === e.target.value)
          if (sample) p.onSample(sample.text)
        }}
      >
        <option value="">Samples...</option>
        {HTML_SAMPLES.map((x) => (
          <option key={x.id} value={x.id}>
            {x.label}
          </option>
        ))}
      </select>
    </header>
  )
}
