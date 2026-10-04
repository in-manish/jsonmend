/** Calendar math and ISO 8601 formatting shared by the datetime handlers. */
import { pad } from '../common'

export interface DateParts {
  year: number
  month: number
  day: number
}

export interface TimeParts {
  hour: number
  minute: number
  second: number
  micro: number
}

/** Offset in minutes east of UTC, or an IANA zone resolved at the wall time. */
export type Tz = { offset: number } | { zone: string }

export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
export const daysIn = (y: number, m: number) =>
  [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]

export function invalidDate(d: DateParts): string | undefined {
  if (!Number.isInteger(d.year) || d.year < 1 || d.year > 9999) return `year ${d.year} out of range`
  if (!Number.isInteger(d.month) || d.month < 1 || d.month > 12)
    return `month ${d.month} out of range`
  if (!Number.isInteger(d.day) || d.day < 1 || d.day > daysIn(d.year, d.month)) {
    return `day ${d.day} out of range for ${d.year}-${pad(d.month, 2)}`
  }
  return undefined
}

export function invalidTime(t: TimeParts): string | undefined {
  if (!Number.isInteger(t.hour) || t.hour < 0 || t.hour > 23) return `hour ${t.hour} out of range`
  if (!Number.isInteger(t.minute) || t.minute < 0 || t.minute > 59)
    return `minute ${t.minute} out of range`
  if (!Number.isInteger(t.second) || t.second < 0 || t.second > 59)
    return `second ${t.second} out of range`
  if (!Number.isInteger(t.micro) || t.micro < 0 || t.micro > 999_999)
    return `microsecond ${t.micro} out of range`
  return undefined
}

export const isoDate = (d: DateParts) => `${pad(d.year, 4)}-${pad(d.month, 2)}-${pad(d.day, 2)}`

export const isoTime = (t: TimeParts) =>
  `${pad(t.hour, 2)}:${pad(t.minute, 2)}:${pad(t.second, 2)}${t.micro ? `.${pad(t.micro, 6)}` : ''}`

export function isoOffset(minutes: number, zulu: boolean): string {
  if (minutes === 0 && zulu) return 'Z'
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  return `${sign}${pad(Math.floor(abs / 60), 2)}:${pad(Math.round(abs % 60), 2)}`
}

export function utcMillis(d: DateParts, t: TimeParts): number {
  const date = new Date(0)
  date.setUTCFullYear(d.year, d.month - 1, d.day)
  date.setUTCHours(t.hour, t.minute, t.second, 0)
  return date.getTime()
}

/** `micros / 10^scale` as a decimal string without float rounding, trailing zeros trimmed. */
export function fixed(micros: bigint, scale: number): string {
  const unit = 10n ** BigInt(scale)
  const neg = micros < 0n
  const abs = neg ? -micros : micros
  const whole = abs / unit
  const frac = (abs % unit).toString().padStart(scale, '0').replace(/0+$/, '')
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`
}
