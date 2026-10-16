import { useEffect } from 'react'
import { pathFor, ROUTES } from '../routes'
import { type Tool, useAppStore } from '../store/useAppStore'
import App from './App'
import { useTheme } from './hooks/useTheme'
import { normalizeUrl, syncUrl, titleFor, toolFromLocation } from './navigation'
import { PyIndentTool } from './pyindent/PyIndentTool'
import { UrlTool } from './url/UrlTool'

const LABELS: Record<Tool, string> = {
  json: 'JSON formatter',
  url: 'URL encode / decode',
  py: 'Python indentation',
}
const TABS = ROUTES.map((r) => ({ id: r.tool, label: LABELS[r.tool] }))

/** Tab bar over the independent tools; each tool owns its whole screen below it. */
export function Shell() {
  const tool = useAppStore((s) => s.tool)
  const setTool = useAppStore((s) => s.setTool)
  useTheme()

  // Address bar <-> tool: canonical path on load, Back/Forward switch tools, title per tool.
  useEffect(() => {
    normalizeUrl(useAppStore.getState().tool)
    const onPop = () => useAppStore.getState().setTool(toolFromLocation())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    document.title = titleFor(tool)
  }, [tool])

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg)] text-[var(--fg)]">
      <nav
        aria-label="Tools"
        className="flex gap-1 border-b border-[var(--border)] bg-[var(--panel)] px-3 pt-1.5"
      >
        {TABS.map((t) => (
          <a
            key={t.id}
            href={pathFor(t.id, import.meta.env.BASE_URL)}
            className="tool-tab"
            aria-current={tool === t.id ? 'page' : undefined}
            onClick={(e) => {
              // Let modified clicks (new tab, copy link) behave like normal links.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
              e.preventDefault()
              setTool(t.id)
              syncUrl(t.id)
            }}
          >
            {t.label}
          </a>
        ))}
      </nav>
      <div className="min-h-0 flex-1">
        {tool === 'json' ? <App /> : tool === 'url' ? <UrlTool /> : <PyIndentTool />}
      </div>
    </div>
  )
}
