import { useAppStore } from '../store/useAppStore'

const PATH_LABEL = {
  strict: 'valid JSON',
  lenient: 'repaired',
  fallback: 'fallback repair',
} as const
const n = (x: number) => x.toLocaleString()

export function StatusBar() {
  const result = useAppStore((s) => s.result)
  const input = useAppStore((s) => s.input)
  const cursor = useAppStore((s) => s.cursor)
  const running = useAppStore((s) => s.running)
  const payloads = result?.payloads
  const setOptions = useAppStore((s) => s.setOptions)

  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted)] tabular-nums">
      <span>In {n(input.length)} chars</span>
      {result?.ok && <span>Out {n(result.stats.outputChars)} chars</span>}
      {result && <span>{result.stats.durationMs.toFixed(1)} ms</span>}
      <span>
        Ln {cursor.line}, Col {cursor.column}
      </span>
      {result?.ok && <span>Depth {result.stats.depth}</span>}
      {result?.path && <span>{PATH_LABEL[result.path]}</span>}
      {running && <span>formatting...</span>}
      {payloads && payloads.list.length > 1 && (
        <span className="flex items-center gap-1">
          Payload {payloads.index + 1} of {payloads.list.length}
          <button
            type="button"
            className="chip"
            aria-label="Previous payload"
            disabled={payloads.index === 0}
            onClick={() => setOptions({ payloadIndex: payloads.index - 1 })}
          >
            Prev
          </button>
          <button
            type="button"
            className="chip"
            aria-label="Next payload"
            disabled={payloads.index === payloads.list.length - 1}
            onClick={() => setOptions({ payloadIndex: payloads.index + 1 })}
          >
            Next
          </button>
        </span>
      )}
    </footer>
  )
}
