/** The message header Gmail shows above the body: subject, sender line and "to me". */
export function GmailHeader({ subject, dark }: { subject: string; dark: boolean }) {
  const bg = dark ? '#202124' : '#fff'
  const fg = dark ? '#e8eaed' : '#202124'
  const muted = dark ? '#9aa0a6' : '#5f6368'
  return (
    <div
      style={{
        background: bg,
        color: fg,
        fontFamily: 'Arial, sans-serif',
        borderBottom: `1px solid ${dark ? '#3c4043' : '#e0e0e0'}`,
      }}
      className="flex-none px-4 py-3"
    >
      <div className="text-[18px] leading-snug" style={{ wordBreak: 'break-word' }}>
        {subject}
        <span
          className="ml-2 rounded px-1 align-middle text-[11px]"
          style={{ background: dark ? '#3c4043' : '#ddd', color: muted }}
        >
          Inbox
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm text-white"
          style={{ background: '#1a73e8' }}
        >
          S
        </span>
        <div className="min-w-0 text-[13px]">
          <div className="truncate">
            <b>Sender</b> <span style={{ color: muted }}>&lt;sender@example.com&gt;</span>
          </div>
          <div style={{ color: muted }}>to me</div>
        </div>
      </div>
    </div>
  )
}
