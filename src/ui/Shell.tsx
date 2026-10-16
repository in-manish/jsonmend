import { type Tool, useAppStore } from '../store/useAppStore'
import App from './App'
import { useTheme } from './hooks/useTheme'
import { PyIndentTool } from './pyindent/PyIndentTool'
import { UrlTool } from './url/UrlTool'

const TABS: { id: Tool; label: string }[] = [
  { id: 'json', label: 'JSON formatter' },
  { id: 'url', label: 'URL encode / decode' },
  { id: 'py', label: 'Python indentation' },
]

/** Tab bar over the independent tools; each tool owns its whole screen below it. */
export function Shell() {
  const tool = useAppStore((s) => s.tool)
  const setTool = useAppStore((s) => s.setTool)
  useTheme()

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg)] text-[var(--fg)]">
      <nav
        aria-label="Tools"
        className="flex gap-1 border-b border-[var(--border)] bg-[var(--panel)] px-3 pt-1.5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tool-tab"
            aria-current={tool === t.id ? 'page' : undefined}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1">
        {tool === 'json' ? <App /> : tool === 'url' ? <UrlTool /> : <PyIndentTool />}
      </div>
    </div>
  )
}
