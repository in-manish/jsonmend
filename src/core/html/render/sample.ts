/** Sample values chosen from variable names (`email`, `price`, `created_at`, `avatar_url`…). */
import type { Shape } from './shape'

const FIRST = ['Jane', 'John', 'Priya', 'Omar', 'Mei']
const LAST = ['Doe', 'Smith', 'Patel', 'Haddad', 'Chen']
const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
]

const humanize = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()

/** `orders` -> `order`, used to name list items. */
const singular = (name: string) =>
  name.endsWith('ies')
    ? `${name.slice(0, -3)}y`
    : name.endsWith('s') && !name.endsWith('ss')
      ? name.slice(0, -1)
      : name

function placeholderImage(label: string, w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#cbd5e1"/><text x="50%" y="50%" fill="#475569" font-family="Arial" font-size="${Math.max(10, Math.min(w, h) / 8)}" text-anchor="middle" dominant-baseline="middle">${label.replace(/[<&]/g, '')}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** One sample value for a variable called `name`; `i` varies the value between list items. */
export function sampleValue(name: string, i: number, hint = ''): unknown {
  const n = name.toLowerCase()
  const k = hint || n
  const pick = <T>(a: T[]) => a[i % a.length]
  if (
    /^(is|has|can|show|enable|enabled|active|paid|published|staff|admin|verified|authenticated)(_|$)|_(enabled|active|visible|verified)$/.test(
      n,
    )
  )
    return true
  if (/e-?mail/.test(n))
    return `${pick(FIRST).toLowerCase()}.${pick(LAST).toLowerCase()}@example.com`
  if (/(avatar|logo|icon)/.test(n)) return placeholderImage(n, 80, 80)
  if (/(image|img|photo|picture|thumbnail|banner|cover|src)/.test(n))
    return placeholderImage(humanize(name) || 'image', 320, 200)
  if (/(url|link|href|website)/.test(n))
    return `https://example.com/${n.replace(/_?(url|link|href)$/, '') || 'page'}/${i + 1}`
  if (/(first_?name)/.test(n)) return pick(FIRST)
  if (/(last_?name|surname)/.test(n)) return pick(LAST)
  if (/^(name|full_?name|username|user|author|customer|owner|recipient|sender|client)$/.test(n))
    return `${pick(FIRST)} ${pick(LAST)}`
  if (/(title|subject|heading|headline)/.test(n))
    return `Sample ${humanize(name) || 'title'}${i ? ` ${i + 1}` : ''}`
  if (/(description|body|content|text|message|summary|bio|excerpt|comment|note)/.test(n))
    return pick(LOREM)
  if (/(price|amount|total|cost|subtotal|balance|fee|tax)/.test(n))
    return Number((49.99 + i * 10).toFixed(2))
  if (k === 'date' || /(date|created|updated|_at$|_on$|timestamp|time)/.test(n))
    return `2025-01-${String(15 + i).padStart(2, '0')}T10:30:00Z`
  if (
    k === 'number' ||
    /(count|qty|quantity|number|num|age|(^|_)id(_|$)|(^|_)pk(_|$)|year|size|total_?items|rating|score)/.test(
      n,
    )
  )
    return 12 + i
  if (/phone|mobile/.test(n)) return `+1 555 01${String(i).padStart(2, '0')}`
  if (/(address|street)/.test(n)) return `${12 + i} Example Street`
  if (/city/.test(n)) return 'Springfield'
  if (/(country)/.test(n)) return 'United States'
  if (/(company|organization|org|brand)/.test(n)) return 'Example Inc.'
  if (/status|state/.test(n)) return pick(['active', 'pending', 'done'])
  if (/colou?r/.test(n)) return '#1a73e8'
  if (/(code|token|key|slug)/.test(n)) return `sample-${n.replace(/\W+/g, '-')}-${i + 1}`
  return `Sample ${humanize(name) || 'value'}${i ? ` ${i + 1}` : ''}`
}

/** Builds JSON data of the shape the template uses. */
export function materialize(s: Shape, name: string, i = 0): unknown {
  if (s.kind === 'obj') {
    return Object.fromEntries([...s.props].map(([k, v]) => [k, materialize(v, k, i)]))
  }
  if (s.kind === 'list') {
    const item = singular(name)
    return [0, 1, 2].map((j) =>
      s.pair
        ? [`${humanize(item) || 'key'} ${j + 1}`, sampleValue('value', j)]
        : materialize(s.elem as Shape, item, j),
    )
  }
  return s.literal !== undefined ? s.literal : sampleValue(name, i, s.hint)
}
