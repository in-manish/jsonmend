/** tzinfo resolution: fixed offsets, UTC spellings and IANA zones (offsets via Intl). */
import type { Node } from '../../ast'
import { arg, intValue, lastSegment, stringValue } from '../common'
import { type DateParts, type TimeParts, type Tz, utcMillis } from './calendar'
import { timedeltaMicros } from './timedelta'

/** Offset (minutes east of UTC) of an IANA zone at a given wall-clock time, via Intl. */
export function zoneOffset(zone: string, d: DateParts, t: TimeParts): number | undefined {
  let fmt: Intl.DateTimeFormat
  try {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
  } catch {
    return undefined
  }
  const wall = utcMillis(d, t)
  let guess = wall
  let offset = 0
  for (let k = 0; k < 3; k++) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
    )
    const seen = utcMillis(
      { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) },
      {
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
        micro: 0,
      },
    )
    offset = (seen - guess) / 60_000
    guess = wall - offset * 60_000
  }
  return offset
}

export function resolveTz(node: Node | undefined): Tz | undefined | 'unknown' {
  if (!node || node.kind === 'null') return undefined
  if (node.kind === 'name') {
    const last = lastSegment(node.name)
    if (last.toLowerCase() === 'utc') return { offset: 0 }
    return 'unknown'
  }
  if (node.kind === 'string') return zoneFromName(node.value)
  if (node.kind === 'repr') {
    if (/^<UTC>$/i.test(node.text)) return { offset: 0 }
    const zone = /'([A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*)'/.exec(node.text)?.[1]
    if (zone) return zoneFromName(zone)
    return 'unknown'
  }
  if (node.kind === 'call') {
    const name = lastSegment(node.name)
    switch (name) {
      case 'tzutc':
      case 'UTC':
        return { offset: 0 }
      case 'timezone': {
        const delta = arg(node, 0, 'offset')
        const micros = delta?.kind === 'call' ? timedeltaMicros(delta) : undefined
        return micros === undefined ? 'unknown' : { offset: Number(micros / 60_000_000n) }
      }
      case 'tzoffset': {
        const seconds = intValue(arg(node, 1, 'offset'))
        return seconds === undefined ? 'unknown' : { offset: seconds / 60 }
      }
      case 'FixedOffset': {
        const minutes = intValue(arg(node, 0, 'offset'))
        return minutes === undefined ? 'unknown' : { offset: minutes }
      }
      case 'ZoneInfo':
      case 'gettz':
      case 'tzfile':
      case 'timezone_':
      case 'tz': {
        const key = stringValue(arg(node, 0, 'key'))
        return key ? zoneFromName(key) : 'unknown'
      }
    }
    // pytz.timezone('Asia/Kolkata') is a dotted call whose last segment is `timezone`, handled above
    // only when it has a timedelta; a string argument means a zone name.
    const key = stringValue(arg(node, 0, 'key'))
    if (key) return zoneFromName(key)
  }
  return 'unknown'
}

export function zoneFromName(name: string): Tz {
  const zone = name.replace(/^.*zoneinfo\//, '')
  return /^(?:UTC|GMT|Z|Etc\/UTC)$/i.test(zone) ? { offset: 0 } : { zone }
}
