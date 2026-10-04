/** Datetimes written as text: pandas Timestamp(...) arguments and the normalizeDateStrings option. */
import {
  type DateParts,
  invalidDate,
  invalidTime,
  isoDate,
  isoOffset,
  isoTime,
  type TimeParts,
  type Tz,
} from './calendar'

const DATETIME_STRING_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?[ ]?(Z|[+-]\d{2}(?::?\d{2})?)?$/

/** Parses `2024-01-05 13:30:00.123+05:30` style text. */
export function parseDatetimeString(
  text: string,
): { d: DateParts; t?: TimeParts; tz?: Tz } | undefined {
  const m = DATETIME_STRING_RE.exec(text.trim())
  if (!m) return undefined
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
  const t =
    m[4] === undefined
      ? undefined
      : {
          hour: Number(m[4]),
          minute: Number(m[5]),
          second: Number(m[6] ?? 0),
          micro: Number((m[7] ?? '').padEnd(6, '0').slice(0, 6)),
        }
  let tz: Tz | undefined
  if (m[8]) {
    if (m[8] === 'Z') tz = { offset: 0 }
    else {
      const sign = m[8][0] === '-' ? -1 : 1
      const digits = m[8].slice(1).replace(':', '')
      tz = { offset: sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || 0)) }
    }
  }
  if (invalidDate(d) || (t && invalidTime(t))) return undefined
  return { d, t, tz }
}

/** For the `normalizeDateStrings` option: ISO form of a datetime-looking string, if it is one. */
export function normalizeDateString(text: string): string | undefined {
  const parsed = parseDatetimeString(text)
  if (!parsed?.t) return undefined
  const offset = parsed.tz && 'offset' in parsed.tz ? isoOffset(parsed.tz.offset, false) : ''
  const iso = `${isoDate(parsed.d)}T${isoTime(parsed.t)}${offset}`
  return iso === text ? undefined : iso
}
