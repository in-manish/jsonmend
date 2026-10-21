/** Django and Jinja filters the preview understands. Unknown filters pass the value through. */
import { DEFAULT_DATE_FORMAT, formatDate, toDate } from './dateFormat'
import { escapeHtml, isPlainObject, Safe, str, truthy } from './value'

type Filter = (v: unknown, args: unknown[]) => unknown

const text = (v: unknown) => (v instanceof Safe ? v.s : str(v))
const num = (v: unknown) => Number(v instanceof Safe ? v.s : v)
const list = (v: unknown): unknown[] =>
  Array.isArray(v) ? v : typeof v === 'string' ? [...v] : isPlainObject(v) ? Object.keys(v) : []
const words = (s: string) => s.split(/\s+/).filter(Boolean)
const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const defaultFilter: Filter = (v, [d]) => (truthy(v) ? v : d)

export const FILTERS: Record<string, Filter> = {
  default: defaultFilter,
  d: defaultFilter,
  default_if_none: (v, [d]) => (v === null || v === undefined ? d : v),
  upper: (v) => text(v).toUpperCase(),
  lower: (v) => text(v).toLowerCase(),
  title: (v) => text(v).replace(/\b\w/g, (c) => c.toUpperCase()),
  capitalize: (v) => text(v).charAt(0).toUpperCase() + text(v).slice(1).toLowerCase(),
  capfirst: (v) => text(v).charAt(0).toUpperCase() + text(v).slice(1),
  trim: (v) => text(v).trim(),
  length: (v) => list(v).length,
  count: (v) => list(v).length,
  first: (v) => list(v)[0],
  last: (v) => list(v).at(-1),
  join: (v, [sep]) =>
    list(v)
      .map(str)
      .join(sep === undefined ? '' : text(sep)),
  safe: (v) => new Safe(text(v)),
  escape: (v) => new Safe(escapeHtml(text(v))),
  e: (v) => new Safe(escapeHtml(text(v))),
  force_escape: (v) => new Safe(escapeHtml(text(v))),
  striptags: (v) => text(v).replace(/<[^>]*>/g, ''),
  linebreaks: (v) =>
    new Safe(
      `<p>${escapeHtml(text(v))
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br>')}</p>`,
    ),
  linebreaksbr: (v) => new Safe(escapeHtml(text(v)).replace(/\n/g, '<br>')),
  slugify: (v) =>
    text(v)
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-'),
  truncatechars: (v, [n]) => {
    const s = text(v)
    return s.length > num(n) ? `${s.slice(0, Math.max(num(n) - 1, 0))}…` : s
  },
  truncatewords: (v, [n]) => {
    const w = words(text(v))
    return w.length > num(n) ? `${w.slice(0, num(n)).join(' ')} …` : text(v)
  },
  wordcount: (v) => words(text(v)).length,
  add: (v, [a]) => (Number.isNaN(num(v) + num(a)) ? text(v) + text(a) : num(v) + num(a)),
  floatformat: (v, [d]) => {
    const places = d === undefined ? -1 : num(d)
    const n = num(v)
    if (Number.isNaN(n)) return ''
    return places < 0 && Number.isInteger(n)
      ? String(n)
      : n.toFixed(Math.abs(places < 0 ? 1 : places))
  },
  round: (v, [d]) => Number(num(v).toFixed(d === undefined ? 0 : num(d))),
  int: (v) => Math.trunc(num(v)) || 0,
  float: (v) => num(v) || 0,
  string: (v) => text(v),
  intcomma: (v) => {
    const [i, f] = String(num(v)).split('.')
    return f ? `${group(i)}.${f}` : group(i)
  },
  pluralize: (v, [s]) => {
    const [one, many] =
      s === undefined ? ['', 's'] : text(s).includes(',') ? text(s).split(',') : ['', text(s)]
    return num(Array.isArray(v) ? v.length : v) === 1 ? one : many
  },
  yesno: (v, [m]) => {
    const [y, n, maybe] = (m === undefined ? 'yes,no,maybe' : text(m)).split(',')
    return v === null || v === undefined ? (maybe ?? n) : truthy(v) ? y : n
  },
  urlencode: (v) => encodeURIComponent(text(v)),
  replace: (v, [a, b]) => text(v).split(text(a)).join(text(b)),
  reverse: (v) => (typeof v === 'string' ? [...v].reverse().join('') : [...list(v)].reverse()),
  sort: (v) => [...list(v)].sort(),
  list: (v) => list(v),
  center: (v, [w]) =>
    text(v)
      .padStart((text(v).length + num(w)) >> 1)
      .padEnd(num(w)),
  date: (v, [f]) => {
    const d = toDate(v)
    return d ? formatDate(d, f === undefined ? DEFAULT_DATE_FORMAT : text(f)) : ''
  },
  time: (v, [f]) => {
    const d = toDate(v)
    return d ? formatDate(d, f === undefined ? 'H:i' : text(f)) : ''
  },
  timesince: () => '2 days',
  timeuntil: () => '2 days',
  filesizeformat: (v) => {
    const n = num(v)
    return n < 1024
      ? `${n} bytes`
      : n < 1048576
        ? `${(n / 1024).toFixed(1)} KB`
        : `${(n / 1048576).toFixed(1)} MB`
  },
}
