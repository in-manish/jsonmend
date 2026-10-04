import { summarize } from '../core/report'
import { useAppStore } from '../store/useAppStore'

/** Screen-reader announcements for results and actions. */
export function Announcer() {
  const result = useAppStore((s) => s.result)
  const notice = useAppStore((s) => s.notice)
  const status = !result
    ? ''
    : result.ok
      ? `Formatted. ${summarize(result.diagnostics)}.`
      : `Error: ${result.error?.message ?? 'could not format'}`
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
      {notice && (
        <div key={notice.nonce} className="toast" role="status" aria-live="polite">
          {notice.text}
        </div>
      )}
    </>
  )
}
