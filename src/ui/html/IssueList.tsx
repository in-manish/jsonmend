import type { Edit, HtmlIssue } from '../../core/html/format'

const SEVERITY_LABEL = { error: 'error', warn: 'check', info: 'note' } as const
const SEVERITY_COLOR = {
  error: 'var(--error)',
  warn: 'var(--warn)',
  info: 'var(--info)',
} as const

interface Props {
  issues: HtmlIssue[]
  hasInput: boolean
  /** Select the issue's span in the input. */
  onReveal(issue: HtmlIssue): void
  onApply(fixes: Edit[]): void
}

export function IssueList({ issues, hasInput, onReveal, onApply }: Props) {
  const fixable = issues.filter((i) => i.fixes?.length)
  const title = !hasInput
    ? 'Paste HTML (or a Django / Jinja template) to format and check it'
    : issues.length === 0
      ? 'No problems found'
      : `${issues.length} issue${issues.length === 1 ? '' : 's'}${fixable.length ? `, ${fixable.length} with a suggested fix` : ''}`

  return (
    <section
      aria-label="Issues"
      className="max-h-[35%] overflow-auto border-t border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
    >
      <div className="flex items-center gap-2">
        <h2 className="pane-title !px-0">{title}</h2>
        {fixable.length > 0 && (
          <button
            type="button"
            className="btn"
            title="Applies every suggested fix to the input. Nothing is removed; fixes only add missing closers or repair typos."
            onClick={() => onApply(fixable.flatMap((i) => i.fixes ?? []))}
          >
            Apply all suggested fixes
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-1">
        {issues.map((i) => (
          <li key={`${i.code}-${i.from}-${i.message}`} className="flex items-start gap-2">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-baseline gap-2 text-left hover:bg-[var(--bg)]"
              onClick={() => onReveal(i)}
            >
              <span className="w-14 shrink-0 tabular-nums text-[var(--muted)]">Line {i.line}</span>
              <span
                className="w-12 shrink-0 text-xs font-semibold uppercase"
                style={{ color: SEVERITY_COLOR[i.severity] }}
              >
                {SEVERITY_LABEL[i.severity]}
              </span>
              <span className="min-w-0">
                {i.message}
                {i.suggestion && <span className="block text-[var(--muted)]">{i.suggestion}</span>}
              </span>
            </button>
            {i.fixes?.length ? (
              <button
                type="button"
                className="btn shrink-0"
                aria-label={`Apply fix for line ${i.line}: ${i.message}`}
                onClick={() => onApply(i.fixes ?? [])}
              >
                Apply fix
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
