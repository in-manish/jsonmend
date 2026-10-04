import { type CSSProperties, useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Announcer } from './Announcer'
import { useFormatter } from './hooks/useFormatter'
import { useTheme } from './hooks/useTheme'
import { InputPane } from './InputPane'
import { copyText } from './lib/files'
import { decodeShare } from './lib/share'
import { OutputPane } from './OutputPane'
import { OptionsPanel } from './options/OptionsPanel'
import { ReportPanel } from './report/ReportPanel'
import { Splitter } from './Splitter'
import { StatusBar } from './StatusBar'
import { Toolbar } from './Toolbar'

export default function App() {
  const dark = useTheme()
  useFormatter()
  const [split, setSplit] = useState(50)

  // Input from a share link (on load, or pasted into an open tab), then drop it from the URL.
  useEffect(() => {
    const load = () => {
      const shared = decodeShare(location.hash)
      if (shared === undefined) return
      useAppStore.getState().setInput(shared)
      history.replaceState(null, '', location.pathname + location.search)
    }
    load()
    window.addEventListener('hashchange', load)
    return () => window.removeEventListener('hashchange', load)
  }, [])

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        useAppStore.getState().requestRun()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        const { result, notify } = useAppStore.getState()
        if (result?.ok)
          notify((await copyText(result.output)) ? 'Copied output' : 'Clipboard is not available')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Toolbar />
      <main
        className="flex min-h-0 flex-1 flex-col md:flex-row"
        style={{ '--split': `${split}%` } as CSSProperties}
      >
        <div className="flex min-h-0 flex-1 md:flex-none md:basis-[var(--split)]">
          <InputPane dark={dark} />
        </div>
        <Splitter onResize={setSplit} />
        <div className="flex min-h-0 flex-1 border-t border-[var(--border)] md:border-t-0">
          <OutputPane dark={dark} />
        </div>
      </main>
      <ReportPanel />
      <StatusBar />
      <OptionsPanel />
      <Announcer />
    </div>
  )
}
