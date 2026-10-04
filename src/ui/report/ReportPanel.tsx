import { useState } from 'react'
import type { Category, Diagnostic } from '../../core'
import { countByCategory, summarize } from '../../core/report'
import { useAppStore } from '../../store/useAppStore'
import { ConversionsTable } from './ConversionsTable'

const FILTERS: (Category | 'all')[] = ['all', 'structure', 'type', 'normalize', 'input', 'output']

export function ReportPanel() {
  const result = useAppStore((s) => s.result)
  const open = useAppStore((s) => s.reportOpen)
  const setOpen = useAppStore((s) => s.setReportOpen)
  const select = useAppStore((s) => s.select)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [tab, setTab] = useState<'changes' | 'conversions'>('changes')

  const diagnostics = result?.diagnostics ?? []
  const counts = countByCategory(diagnostics)
  const shown = diagnostics
    .map((d, i) => [d, i] as const)
    .filter(([d]) => filter === 'all' || d.category === filter)

  return (
    <section aria-label="Report" className="border-t border-[var(--border)] bg-[var(--panel)]">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-medium"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        Report
        <span className="font-normal text-[var(--muted)]">
          {result ? summarize(diagnostics) : 'Nothing formatted yet'}
        </span>
      </button>
      {open && result && (
        <div className="max-h-[30vh] overflow-auto px-3 pb-2 text-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <fieldset className="segmented" aria-label="Report view">
              <button
                type="button"
                aria-pressed={tab === 'changes'}
                onClick={() => setTab('changes')}
              >
                All changes
              </button>
              <button
                type="button"
                aria-pressed={tab === 'conversions'}
                onClick={() => setTab('conversions')}
              >
                Type conversions ({counts.type})
              </button>
            </fieldset>
            {tab === 'changes' && (
              <label className="flex items-center gap-1 text-[var(--muted)]">
                Show
                <select
                  className="input-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Category | 'all')}
                >
                  {FILTERS.map((f) => (
                    <option key={f} value={f}>
                      {f === 'all'
                        ? `everything (${diagnostics.length})`
                        : `${f} (${counts[f as Category]})`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {tab === 'conversions' ? (
            <ConversionsTable diagnostics={diagnostics} onSelect={select} />
          ) : (
            <ol className="flex flex-col gap-0.5">
              {shown.map(([d, i]) => (
                <li key={i}>
                  <button type="button" className="report-row" onClick={() => select(i)}>
                    <span className={`sev sev-${d.severity}`}>{d.severity}</span>
                    <span className="flex-1">{d.message}</span>
                    <Location d={d} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}

function Location({ d }: { d: Diagnostic }) {
  const input = useAppStore((s) => s.resultInput) ?? ''
  if (!d.span) return null
  const before = input.slice(0, d.span.start)
  const line = before.split('\n').length
  const column = d.span.start - before.lastIndexOf('\n')
  return <span className="text-xs text-[var(--muted)] tabular-nums">{`${line}:${column}`}</span>
}
