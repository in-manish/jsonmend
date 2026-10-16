/** URL encodings the tool understands. Pure TS, no DOM dependencies beyond atob/btoa. */
export type UrlMode = 'component' | 'uri' | 'form' | 'base64' | 'base64url'
export type Direction = 'decode' | 'encode'

export const MODES: { id: UrlMode; label: string; hint: string }[] = [
  {
    id: 'component',
    label: 'Percent (component)',
    hint: "encodeURIComponent: escapes everything except letters, digits and - _ . ! ~ * ' ( )",
  },
  {
    id: 'uri',
    label: 'Percent (full URL)',
    hint: 'encodeURI: keeps URL punctuation such as : / ? # & = intact',
  },
  {
    id: 'form',
    label: 'Form (+ for space)',
    hint: 'application/x-www-form-urlencoded: spaces become +',
  },
  { id: 'base64', label: 'Base64', hint: 'Standard Base64 of the UTF-8 text' },
  { id: 'base64url', label: 'Base64 URL-safe', hint: 'Base64 with - and _, no padding' },
]

export type CodecResult =
  | { ok: true; output: string; passes: number }
  | { ok: false; error: string }

const MAX_PASSES = 10

function percentError(text: string, e: unknown): string {
  const bad = /%(?![0-9a-fA-F]{2})/.exec(text)
  if (bad)
    return `Malformed percent-encoding: "%" at position ${bad.index + 1} is not followed by two hex digits`
  return e instanceof URIError ? 'Percent-encoded bytes are not valid UTF-8' : String(e)
}

function decodeOnce(mode: UrlMode, text: string): string {
  switch (mode) {
    case 'component':
      return decodeURIComponent(text)
    case 'uri':
      return decodeURI(text)
    case 'form':
      return decodeURIComponent(text.replace(/\+/g, ' '))
    default:
      return fromBase64(text)
  }
}

function encodeOnce(mode: UrlMode, text: string): string {
  switch (mode) {
    case 'component':
      return encodeURIComponent(text)
    case 'uri':
      return encodeURI(text)
    case 'form':
      return encodeURIComponent(text).replace(/%20/g, '+')
    case 'base64':
      return toBase64(text)
    case 'base64url':
      return toBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
}

function toBase64(text: string): string {
  let binary = ''
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(text: string): string {
  const clean = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  if (/[^A-Za-z0-9+/]/.test(clean)) throw new Error('Not valid Base64: unexpected character')
  if (clean.length % 4 === 1) throw new Error('Not valid Base64: incomplete input')
  const binary = atob(clean + '='.repeat((4 - (clean.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('Decoded bytes are not valid UTF-8 text')
  }
}

/**
 * Converts `text`. With `repeat`, decoding runs until the text stops changing (for
 * double-encoded URLs such as `%2520`), up to 10 passes; `passes` says how many changed it.
 */
export function convert(
  direction: Direction,
  mode: UrlMode,
  text: string,
  repeat = false,
): CodecResult {
  try {
    if (direction === 'encode') return { ok: true, output: encodeOnce(mode, text), passes: 1 }
    let current = text
    let passes = 0
    for (let i = 0; i < (repeat ? MAX_PASSES : 1); i++) {
      const next = decodeOnce(mode, current)
      if (next === current) break
      current = next
      passes++
    }
    return { ok: true, output: current, passes }
  } catch (e) {
    const isPercent = mode !== 'base64' && mode !== 'base64url'
    return { ok: false, error: isPercent ? percentError(text, e) : (e as Error).message }
  }
}

export interface UrlParts {
  protocol: string
  username: string
  password: string
  host: string
  port: string
  path: string
  hash: string
  query: { key: string; value: string }[]
}

/** Splits an absolute URL into its parts; undefined when the text is not one. */
export function parseUrl(text: string): UrlParts | undefined {
  const trimmed = text.trim()
  if (!trimmed || /\s/.test(trimmed)) return undefined
  try {
    const u = new URL(trimmed)
    return {
      protocol: u.protocol,
      username: u.username,
      password: u.password,
      host: u.hostname,
      port: u.port,
      path: u.pathname,
      hash: u.hash,
      query: Array.from(u.searchParams, ([key, value]) => ({ key, value })),
    }
  } catch {
    return undefined
  }
}
