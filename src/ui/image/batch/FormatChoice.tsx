import { FormatControls } from '../edit/FormatControls'
import type { ImagePrefs } from '../useImageStore'

/** The convert goal's one question: which file type? */
export function FormatChoice({
  prefs,
  onChange,
}: {
  prefs: ImagePrefs['batch']
  onChange(patch: Partial<ImagePrefs['batch']>): void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
      <p className="text-sm font-medium">Change every photo to</p>
      <FormatControls edit={prefs} onChange={onChange} quality={false} />
    </div>
  )
}
