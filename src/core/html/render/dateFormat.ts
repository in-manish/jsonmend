/** Django `date` filter format characters (the common subset). Dates are formatted in UTC. */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const pad = (n: number) => String(n).padStart(2, '0')

export function toDate(v: unknown): Date | undefined {
  const d =
    v instanceof Date ? v : new Date(typeof v === 'number' || typeof v === 'string' ? v : NaN)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function formatDate(d: Date, fmt: string): string {
  const h12 = d.getUTCHours() % 12 || 12
  const map: Record<string, string> = {
    d: pad(d.getUTCDate()),
    j: String(d.getUTCDate()),
    m: pad(d.getUTCMonth() + 1),
    n: String(d.getUTCMonth() + 1),
    M: MONTHS[d.getUTCMonth()].slice(0, 3),
    F: MONTHS[d.getUTCMonth()],
    y: pad(d.getUTCFullYear() % 100),
    Y: String(d.getUTCFullYear()),
    D: DAYS[d.getUTCDay()].slice(0, 3),
    l: DAYS[d.getUTCDay()],
    H: pad(d.getUTCHours()),
    G: String(d.getUTCHours()),
    h: pad(h12),
    g: String(h12),
    i: pad(d.getUTCMinutes()),
    s: pad(d.getUTCSeconds()),
    A: d.getUTCHours() < 12 ? 'AM' : 'PM',
    a: d.getUTCHours() < 12 ? 'a.m.' : 'p.m.',
  }
  let out = ''
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] === '\\' && i + 1 < fmt.length) out += fmt[++i]
    else out += map[fmt[i]] ?? fmt[i]
  }
  return out
}

/** Django's named formats, used when `date` has no argument. */
export const DEFAULT_DATE_FORMAT = 'M j, Y'
