import { useAppStore } from '../store/useAppStore'

/** Pretty (one value per line) or minified output; Pretty restores the last indent used. */
export function LayoutSwitch() {
  const minified = useAppStore((s) => s.options.indent === 'none')
  const prettyIndent = useAppStore((s) => s.prettyIndent)
  const setOptions = useAppStore((s) => s.setOptions)
  return (
    <fieldset className="segmented" aria-label="Output layout">
      <button
        type="button"
        aria-pressed={!minified}
        onClick={() => setOptions({ indent: prettyIndent })}
      >
        Pretty
      </button>
      <button type="button" aria-pressed={minified} onClick={() => setOptions({ indent: 'none' })}>
        Minified
      </button>
    </fieldset>
  )
}
