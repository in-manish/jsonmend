import { TargetSizeControls } from '../TargetSizeControls'
import type { TargetPrefs } from '../useImageStore'

/** The upload goal's one question: how big may each photo be? */
export function LimitChoice({
  target,
  onChange,
}: {
  target: TargetPrefs
  onChange(patch: Partial<TargetPrefs>): void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
      <p className="text-sm font-medium">Each photo must be smaller than</p>
      <TargetSizeControls target={target} onChange={onChange} allowOff={false} />
      <p className="text-xs text-[var(--muted)]">
        Not sure? Most forms accept 200 KB to 1 MB; the form usually says.
      </p>
    </div>
  )
}
