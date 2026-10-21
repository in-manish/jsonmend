/** File sizes: units, parsing and display. Binary units (1 KB = 1024 bytes), as file managers show. */
export type SizeUnit = 'kb' | 'mb'

const UNIT_BYTES: Record<SizeUnit, number> = { kb: 1024, mb: 1024 * 1024 }

export function toBytes(value: number, unit: SizeUnit): number {
  return Math.max(1, Math.round(value * UNIT_BYTES[unit]))
}

export function fromBytes(bytes: number, unit: SizeUnit): number {
  return bytes / UNIT_BYTES[unit]
}

/** "250" with a unit, or "1.5 MB" / "300kb" with its own: bytes, or undefined if unreadable. */
export function parseSize(text: string, defaultUnit: SizeUnit = 'kb'): number | undefined {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(kb|mb|k|m)?\s*$/i.exec(text)
  if (!m) return undefined
  const value = Number(m[1].replace(',', '.'))
  if (!(value > 0)) return undefined
  const unit = m[2] ? (m[2].toLowerCase().startsWith('m') ? 'mb' : 'kb') : defaultUnit
  return toBytes(value, unit)
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 2 : 1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
