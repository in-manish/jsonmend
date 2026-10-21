/**
 * Renders HTML in a fully sandboxed frame: no scripts, no forms, no navigation, no same-origin
 * access. A srcdoc frame inherits the page's CSP, so it also cannot load anything from the network.
 */
export function PreviewFrame({ html }: { html: string }) {
  if (html.trim() === '') {
    return (
      <p className="p-4 text-sm text-[var(--muted)]">Paste HTML on the left to preview it here.</p>
    )
  }
  return (
    <iframe
      title="HTML preview"
      sandbox=""
      srcDoc={html}
      referrerPolicy="no-referrer"
      className="h-full w-full border-0 bg-white"
    />
  )
}
