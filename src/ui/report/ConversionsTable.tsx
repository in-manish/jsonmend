import type { Diagnostic } from '../../core'

/** Original snippet -> JSON value, for every type conversion. */
export function ConversionsTable(props: {
  diagnostics: Diagnostic[]
  onSelect(index: number): void
}) {
  const rows = props.diagnostics
    .map((d, i) => [d, i] as const)
    .filter(([d]) => d.category === 'type' && d.original !== undefined)
  if (rows.length === 0) return <p className="text-[var(--muted)]">No type conversions.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            <th className="py-1 pr-3 font-normal">Original</th>
            <th className="py-1 pr-3 font-normal">JSON</th>
            <th className="py-1 font-normal">Kind</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([d, i]) => (
            <tr key={i} className="border-t border-[var(--border)]">
              <td className="py-1 pr-3 align-top">
                <button
                  type="button"
                  className="text-left hover:underline"
                  onClick={() => props.onSelect(i)}
                >
                  {d.original}
                </button>
              </td>
              <td className="py-1 pr-3 align-top">{d.converted}</td>
              <td className="py-1 align-top text-[var(--muted)]">
                {d.code.replace(/^type\./, '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
