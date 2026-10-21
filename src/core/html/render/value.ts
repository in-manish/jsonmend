/** Values the renderer works with: JSON data plus Python-style truthiness and printing. */

/** Output that must not be HTML-escaped (the `safe` filter). */
export class Safe {
  readonly s: string
  constructor(s: string) {
    this.s = s
  }
}

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function truthy(v: unknown): boolean {
  if (v instanceof Safe) return v.s !== ''
  if (Array.isArray(v)) return v.length > 0
  if (v && typeof v === 'object') return Object.keys(v).length > 0
  return Boolean(v)
}

/** How a value prints (undefined prints as nothing, as in both engines). */
export function str(v: unknown): string {
  if (v === undefined) return ''
  if (v instanceof Safe) return v.s
  if (v === null) return 'None'
  if (v === true) return 'True'
  if (v === false) return 'False'
  if (Array.isArray(v))
    return `[${v.map((x) => (typeof x === 'string' ? `'${x}'` : str(x))).join(', ')}]`
  if (typeof v === 'object') return '{…}'
  return String(v)
}

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Safe)

const own = (o: object, k: string) => Object.hasOwn(o, k)

/** `obj.key` / `obj[key]` on plain data only; never reaches prototypes or functions. */
export function getAttr(obj: unknown, key: unknown): unknown {
  const k = String(key)
  if (typeof obj === 'string' && /^\d+$/.test(k)) return obj[Number(k)]
  if (Array.isArray(obj)) {
    if (/^-?\d+$/.test(k)) return obj.at(Number(k))
    // Django ORM-style helpers on lists.
    if (k === 'all' || k === 'values') return obj
    if (k === 'count') return obj.length
    if (k === 'first') return obj[0]
    if (k === 'last') return obj.at(-1)
    return undefined
  }
  if (!isPlainObject(obj)) return undefined
  if (own(obj, k)) return obj[k]
  if (k === 'items') return Object.entries(obj)
  if (k === 'keys') return Object.keys(obj)
  if (k === 'values') return Object.values(obj)
  return undefined
}

export function deepMerge(base: unknown, over: unknown): unknown {
  if (isPlainObject(base) && isPlainObject(over)) {
    const out: Record<string, unknown> = { ...base }
    for (const [k, v] of Object.entries(over)) {
      if (k === '__proto__') continue
      out[k] = k in base ? deepMerge(base[k], v) : v
    }
    return out
  }
  return over === undefined ? base : over
}
