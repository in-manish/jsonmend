import { useAppStore } from '../store/useAppStore'

const icon = (children: React.ReactNode) => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5" />
    {children}
  </svg>
)

/** Input above output (default) or input beside output; phones always stack. */
export function OrientationSwitch() {
  const orientation = useAppStore((s) => s.orientation)
  const setOrientation = useAppStore((s) => s.setOrientation)
  return (
    <fieldset className="segmented hidden md:inline-flex" aria-label="Pane orientation">
      <button
        type="button"
        aria-pressed={orientation === 'vertical'}
        aria-label="Input on top, output below"
        title="Input on top, output below"
        onClick={() => setOrientation('vertical')}
      >
        {icon(<path d="M1.75 8h12.5" />)}
      </button>
      <button
        type="button"
        aria-pressed={orientation === 'horizontal'}
        aria-label="Input on left, output on right"
        title="Input on left, output on right"
        onClick={() => setOrientation('horizontal')}
      >
        {icon(<path d="M8 2.75v10.5" />)}
      </button>
    </fieldset>
  )
}
