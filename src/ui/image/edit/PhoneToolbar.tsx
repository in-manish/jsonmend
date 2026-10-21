export type PhoneTool = 'crop' | 'rotate' | 'resize' | 'format' | 'size' | 'info'

/** Outline icons, 24px, one path each. */
const ICONS: Record<PhoneTool, string> = {
  crop: 'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14',
  rotate: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  resize: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  format: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4',
  size: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
}

export const TOOL_LABELS: Record<PhoneTool, string> = {
  crop: 'Crop',
  rotate: 'Rotate',
  resize: 'Resize',
  format: 'Save as',
  size: 'File size',
  info: 'Info',
}

interface Props {
  active: PhoneTool | undefined
  onPick(tool: PhoneTool): void
}

/** Bottom tool bar, like a phone photo editor: one tap opens that tool's panel. */
export function PhoneToolbar({ active, onPick }: Props) {
  return (
    <nav
      aria-label="Image tools"
      className="flex flex-none border-t border-[var(--border)] bg-[var(--panel)] pb-[env(safe-area-inset-bottom)]"
    >
      {(Object.keys(ICONS) as PhoneTool[]).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={active === t}
          onClick={() => onPick(t)}
          className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] leading-tight ${
            active === t ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={ICONS[t]} />
          </svg>
          <span className="max-w-full truncate font-medium">{TOOL_LABELS[t]}</span>
        </button>
      ))}
    </nav>
  )
}
