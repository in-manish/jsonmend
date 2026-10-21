import { useMemo } from 'react'
import { simulateGmail } from '../../../core/html/email/gmail'
import { fillTemplate } from '../../../core/html/render/index'
import { looksLikeTemplate } from '../../../core/html/template/index'
import { PreviewFrame } from '../PreviewFrame'
import { useHtmlStore } from '../useHtmlStore'
import { DeviceFrame } from './DeviceFrame'
import { deviceById } from './devices'
import { GmailHeader } from './GmailHeader'
import { GmailNotes } from './GmailNotes'
import { PreviewToolbar } from './PreviewToolbar'
import { SampleDataPanel } from './SampleDataPanel'

/** The user's JSON overrides, or why they could not be read. */
function parseOverrides(text: string | undefined): { value?: unknown; error?: string } {
  if (text === undefined) return {}
  try {
    const value: unknown = JSON.parse(text)
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? { value }
      : { error: 'the top level must be an object' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'syntax error' }
  }
}

/**
 * The Preview view: optional sample-data fill for templates, device size, optional Gmail
 * rendering, and the lists of what was simulated or changed.
 */
export function PreviewPane({ html }: { html: string }) {
  const prefs = useHtmlStore((s) => s.preview)
  const setPreview = useHtmlStore((s) => s.setPreview)
  const device = deviceById(prefs.device)
  const canFill = useMemo(() => looksLikeTemplate(html), [html])
  const overrides = useMemo(() => parseOverrides(prefs.data), [prefs.data])

  const filled = useMemo(
    () => (prefs.fill && canFill ? fillTemplate(html, overrides.value) : undefined),
    [html, prefs.fill, canFill, overrides.value],
  )
  const source = filled ? filled.html : html
  const gmail = useMemo(
    () =>
      prefs.gmail === 'off'
        ? undefined
        : simulateGmail(source, { account: prefs.gmail, dark: prefs.dark }),
    [source, prefs.gmail, prefs.dark],
  )

  const content = (
    <div className="flex h-full min-h-0 w-full flex-col">
      {gmail && <GmailHeader subject={gmail.subject} dark={prefs.dark} />}
      <div className="min-h-0 flex-1">
        <PreviewFrame html={gmail ? gmail.html : source} />
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <PreviewToolbar prefs={prefs} onChange={setPreview} canFill={canFill} />
      <div className="min-h-0 flex-1">
        {device ? (
          <DeviceFrame device={device} landscape={prefs.landscape}>
            {content}
          </DeviceFrame>
        ) : (
          content
        )}
      </div>
      {gmail && <GmailNotes notes={gmail.notes} bytes={gmail.bytes} />}
      {filled && (
        <SampleDataPanel
          generated={filled.generated}
          text={prefs.data}
          error={overrides.error}
          notes={filled.notes}
          onChange={(data) => setPreview({ data })}
        />
      )}
    </div>
  )
}
