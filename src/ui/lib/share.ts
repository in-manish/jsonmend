/**
 * Share links carry the input in the URL hash (never sent to a server). Off unless the user
 * presses Share, and limited in size so links stay usable.
 */
export const SHARE_LIMIT = 16 * 1024
const PREFIX = '#input='

export function encodeShare(input: string): string | undefined {
  const bytes = new TextEncoder().encode(input)
  if (bytes.length > SHARE_LIMIT) return undefined
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${location.origin}${location.pathname}${PREFIX}${b64}`
}

export function decodeShare(hash: string): string | undefined {
  if (!hash.startsWith(PREFIX)) return undefined
  try {
    const b64 = hash.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(b64)
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
  } catch {
    return undefined
  }
}
