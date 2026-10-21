import {
  describe,
  flipHorizontal,
  flipVertical,
  IDENTITY,
  isIdentity,
  type Orientation,
  rotateLeft,
  rotateRight,
} from '../../../core/image/orient'

interface Props {
  orient: Orientation
  onChange(o: Orientation): void
}

const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

/** Rotate in quarter turns and flip, like a phone's photo editor. */
export function OrientationControls({ orient, onChange }: Props) {
  const buttons: { label: string; icon: string; next(o: Orientation): Orientation }[] = [
    { label: 'Rotate left', icon: 'M5 2 2 5l3 3M2 5h7a5 5 0 1 1-5 5', next: rotateLeft },
    { label: 'Rotate right', icon: 'M11 2l3 3-3 3M14 5H7a5 5 0 1 0 5 5', next: rotateRight },
    { label: 'Mirror', icon: 'M8 1v14M5 4 1 8l4 4zM11 4l4 4-4 4z', next: flipHorizontal },
    { label: 'Upside down', icon: 'M1 8h14M4 5l4-4 4 4zM4 11l4 4 4-4z', next: flipVertical },
  ]
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            className="btn flex items-center justify-center gap-1.5"
            onClick={() => onChange(b.next(orient))}
          >
            <Icon d={b.icon} />
            {b.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-[var(--muted)]" data-testid="orientation-state">
        {describe(orient)}
      </p>
      <button
        type="button"
        className="btn"
        disabled={isIdentity(orient)}
        onClick={() => onChange(IDENTITY)}
      >
        Undo rotation
      </button>
    </div>
  )
}
