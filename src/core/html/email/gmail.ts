/**
 * Approximates how Gmail shows an HTML email: strips what Gmail strips, clips at 102 KB, and
 * reports each change. It is a preview aid built from Gmail's documented behavior, not Gmail.
 * Pure TS (string based); the preview frame, not this code, is the security boundary.
 */
import { cleanCss, MAX_STYLE_BYTES } from './css'

/** `gmail`: Google account (supports `<style>`). `other`: non-Google account in the Gmail app (does not). */
export type GmailAccount = 'gmail' | 'other'

export interface GmailOptions {
  account: GmailAccount
  dark: boolean
}

export interface GmailNote {
  severity: 'error' | 'warn' | 'info'
  message: string
}

export interface GmailResult {
  /** Full document to render in the preview frame. */
  html: string
  subject: string
  notes: GmailNote[]
  bytes: number
  clipped: boolean
}

/** Gmail clips messages larger than this behind "View entire message". */
export const CLIP_BYTES = 102 * 1024

const encoder = new TextEncoder()
const byteLength = (s: string) => encoder.encode(s).length

const BASE_CSS =
  'html,body{margin:0;background:#fff}body{padding:16px;font:14px/1.5 Arial,Helvetica,sans-serif;color:#222;word-wrap:break-word}img{max-width:100%}'
// Approximation of Gmail's dark mode: invert the message, then flip images back.
const DARK_CSS =
  'body{filter:invert(1) hue-rotate(180deg)}img,video{filter:invert(1) hue-rotate(180deg)}'
const CLIP_BAR =
  '<div style="margin:16px 0;padding:8px 12px;border-top:1px solid #ddd;color:#1a73e8;font:13px Arial">[Message clipped]&nbsp; View entire message</div>'

/** Tags removed outright, with the reason shown to the user. */
const REMOVED: [string, RegExp, string][] = [
  ['script', /<script\b[\s\S]*?<\/script\s*>|<script\b[^>]*\/?>/gi, '<script> is removed'],
  ['link', /<link\b[^>]*>/gi, '<link> (external stylesheets, fonts) is removed'],
  [
    'iframe',
    /<(iframe|object|embed)\b[\s\S]*?<\/\1\s*>|<embed\b[^>]*>/gi,
    '<iframe>, <object> and <embed> are removed',
  ],
  ['svg', /<svg\b[\s\S]*?<\/svg\s*>/gi, 'Inline <svg> is not displayed'],
  ['media', /<(video|audio)\b[\s\S]*?<\/\1\s*>/gi, '<video> and <audio> are not displayed'],
  [
    'form',
    /<\/?(form|input|button|select|textarea)\b[^>]*>/gi,
    'Form elements (<form>, <input>, <button>…) are removed',
  ],
]

export function simulateGmail(source: string, opts: GmailOptions): GmailResult {
  const notes: GmailNote[] = []
  const bytes = byteLength(source)
  let html = source

  for (const [, re, message] of REMOVED) {
    const hit = html.match(re)
    if (hit) {
      notes.push({ severity: 'warn', message: `${message} (${hit.length}×)` })
      html = html.replace(re, '')
    }
  }
  const handlers = html.match(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi)
  if (handlers) {
    notes.push({
      severity: 'warn',
      message: `Event handlers (onclick…) are removed (${handlers.length}×)`,
    })
    html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  }
  if (/href\s*=\s*["']?\s*javascript:/i.test(html)) {
    notes.push({ severity: 'warn', message: '"javascript:" links are removed' })
    html = html.replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"')
  }

  // <style> blocks: unsupported entirely for other accounts, cleaned (and size-capped) otherwise.
  const kept: string[] = []
  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (_, css: string) => {
    if (opts.account === 'other') return ''
    if (byteLength(css) > MAX_STYLE_BYTES) {
      notes.push({ severity: 'error', message: '<style> over 16 KB: Gmail drops the whole block' })
      return ''
    }
    const cleaned = cleanCss(css)
    for (const d of cleaned.dropped) notes.push({ severity: 'warn', message: `In <style>: ${d}` })
    kept.push(cleaned.css)
    return ''
  })
  if (opts.account === 'other' && /<style\b/i.test(source)) {
    notes.push({
      severity: 'error',
      message:
        '<style> blocks are ignored for non-Google accounts in the Gmail app: use inline style="" attributes',
    })
  }

  html = html.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_, q: string, css: string) => {
    const cleaned = cleanCss(css)
    for (const d of cleaned.dropped) notes.push({ severity: 'warn', message: `In style="": ${d}` })
    return ` style=${q}${cleaned.css}${q}`
  })
  if (opts.account === 'other') {
    html = html.replace(/\s(class|id)\s*=\s*("[^"]*"|'[^']*')/gi, '')
  }

  const subject = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source)?.[1].trim() || '(no subject)'
  html = html
    .replace(
      /<!doctype[^>]*>|<\/?(html|head|body)\b[^>]*>|<title[\s\S]*?<\/title>|<(meta|base)\b[^>]*>/gi,
      '',
    )
    .trim()

  let clipped = false
  if (bytes > CLIP_BYTES) {
    clipped = true
    html = `${cutAtTag(html, CLIP_BYTES)}${CLIP_BAR}`
    notes.push({
      severity: 'error',
      message: `Message is ${(bytes / 1024).toFixed(0)} KB: Gmail clips it after 102 KB behind "View entire message"`,
    })
  } else if (bytes > CLIP_BYTES * 0.8) {
    notes.push({
      severity: 'warn',
      message: `Message is ${(bytes / 1024).toFixed(0)} KB: close to Gmail's 102 KB clip limit`,
    })
  }

  const css = [BASE_CSS, ...kept, ...(opts.dark ? [DARK_CSS] : [])].join('\n')
  return {
    html: `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${html}</body>`,
    subject,
    notes,
    bytes,
    clipped,
  }
}

/** Cuts `html` at about `limit` bytes without leaving half a tag. */
function cutAtTag(html: string, limit: number): string {
  let cut = html.slice(0, limit)
  while (byteLength(cut) > limit) cut = cut.slice(0, -1024)
  const lt = cut.lastIndexOf('<')
  return lt > cut.lastIndexOf('>') ? cut.slice(0, lt) : cut
}
