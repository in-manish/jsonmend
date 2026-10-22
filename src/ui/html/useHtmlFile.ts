import { type DragEvent, useCallback, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { readTextFile } from '../lib/files'

/** What the file picker offers: HTML pages and Django / Jinja templates. */
export const HTML_ACCEPT = '.html,.htm,.xhtml,.shtml,.jinja,.jinja2,.j2,.djhtml,.tpl,.txt,text/html'

/**
 * Opens an HTML file from disk (file picker or drag and drop) into the input, and remembers its
 * name so the formatted download keeps it. Nothing is uploaded; the file is read in the browser.
 */
export function useHtmlFile(setInput: (text: string) => void) {
  const notify = useAppStore((s) => s.notify)
  const [fileName, setFileName] = useState<string>()
  const [dragging, setDragging] = useState(false)

  const open = useCallback(
    async (files: FileList | File[] | null | undefined) => {
      const file = files?.[0]
      if (!file) return
      try {
        setInput(await readTextFile(file))
        setFileName(file.name)
        notify(`Opened ${file.name}`)
      } catch (err) {
        notify(err instanceof Error ? err.message : `Could not open ${file.name}`)
      }
    },
    [setInput, notify],
  )

  /** Spread onto the drop area. */
  const dropProps = {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: DragEvent) => {
      if (!e.dataTransfer.files.length) return
      e.preventDefault()
      setDragging(false)
      void open(e.dataTransfer.files)
    },
  }

  /** "page.html" -> "page.formatted.html"; "formatted.html" when nothing was opened. */
  const downloadName = fileName
    ? `${fileName.replace(/\.[^.]+$/, '')}.formatted${/\.[^.]+$/.exec(fileName)?.[0] ?? '.html'}`
    : 'formatted.html'

  return { open, fileName, forget: () => setFileName(undefined), dragging, dropProps, downloadName }
}
