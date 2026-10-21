import { useEffect, useRef, useState } from 'react'

interface Props {
  accept: string
  multiple?: boolean
  label: string
  hint: string
  onFiles(files: File[]): void
  /** Also accept files pasted from the clipboard (screenshots, copied images). */
  paste?: boolean
  compact?: boolean
  /** One big solid button (phones), instead of a dashed drop area. */
  primary?: boolean
}

/** Click, drag and drop, or paste files. Nothing is uploaded; files are read in the browser. */
export function DropZone({
  accept,
  multiple,
  label,
  hint,
  onFiles,
  paste,
  compact,
  primary,
}: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (!paste) return
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])]
      if (files.length) onFiles(multiple ? files : files.slice(0, 1))
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [paste, multiple, onFiles])

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const files = [...e.dataTransfer.files]
        if (files.length) onFiles(multiple ? files : files.slice(0, 1))
      }}
      className={
        primary
          ? 'flex w-full flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--accent)] px-6 py-6 text-center text-[var(--accent-fg)] shadow-md active:opacity-90'
          : `flex w-full flex-col items-center justify-center gap-1 rounded border-2 border-dashed text-center ${
              compact ? 'p-3' : 'p-8'
            } ${over ? 'border-[var(--accent)] bg-[var(--panel)]' : 'border-[var(--border)]'} hover:border-[var(--accent)]`
      }
    >
      <span className={primary ? 'text-xl font-semibold' : 'font-medium'}>{label}</span>
      <span className={primary ? 'text-sm opacity-90' : 'text-xs text-[var(--muted)]'}>{hint}</span>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        data-testid="file-input"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (files.length) onFiles(files)
        }}
      />
    </button>
  )
}
