/**
 * datetime / date / time / timedelta, pandas Timestamp / Timedelta, and their tzinfo forms.
 *
 *   datetime.datetime(2024, 1, 5, 13, 30, tzinfo=datetime.timezone.utc) -> "2024-01-05T13:30:00+00:00"
 *   datetime.date(2024, 1, 5)                                           -> "2024-01-05"
 *   datetime.time(13, 30)                                               -> "13:30:00"
 *   datetime.timedelta(days=1, seconds=5)                               -> "P1DT5S"
 *   Timestamp('2024-01-05 13:30:00')                                    -> "2024-01-05T13:30:00"
 *
 * tzinfo forms: timezone.utc, timezone(timedelta(hours=5, minutes=30)), tzutc(), tzoffset(None, 19800),
 * pytz.UTC, <UTC>, pytz.FixedOffset(330), ZoneInfo('Asia/Kolkata'), <DstTzInfo 'Asia/Kolkata' ...>.
 */
import { type CallNode, type JsonNode, num, obj, str } from '../../ast'
import {
  arg,
  intValue,
  lastSegment,
  stringValue,
  type TransformContext,
  type TypeHandler,
} from '../common'
import {
  type DateParts,
  invalidDate,
  invalidTime,
  isoDate,
  isoOffset,
  isoTime,
  type TimeParts,
  utcMillis,
} from './calendar'
import { invalidCall } from './invalid'
import { renderDatetime } from './render'
import { parseDatetimeString } from './strings'
import { renderTimedelta } from './timedelta'
import { resolveTz } from './zones'

const dateArgs = (call: CallNode): DateParts | undefined => {
  const year = intValue(arg(call, 0, 'year'))
  const month = intValue(arg(call, 1, 'month'))
  const day = intValue(arg(call, 2, 'day'))
  if (year === undefined || month === undefined || day === undefined) return undefined
  return { year, month, day }
}

const timeArgs = (call: CallNode, offset: number): TimeParts | undefined => {
  const value = (i: number, name: string) => {
    const node = arg(call, offset + i, name)
    return node ? intValue(node) : 0
  }
  const hour = value(0, 'hour')
  const minute = value(1, 'minute')
  const second = value(2, 'second')
  const micro = value(3, 'microsecond')
  if (hour === undefined || minute === undefined || second === undefined || micro === undefined) {
    return undefined
  }
  return { hour, minute, second, micro }
}

const tzArg = (call: CallNode, index: number, ctx: TransformContext) => {
  const node = arg(call, index, 'tzinfo') ?? arg(call, -1, 'tz')
  const tz = resolveTz(node)
  if (tz === 'unknown') {
    ctx.warn(
      call,
      'type.unknown-tzinfo',
      `Unrecognised tzinfo ${ctx.snippet(node?.span)}; output is naive`,
    )
    return undefined
  }
  return tz
}

export const datetimeHandler: TypeHandler = {
  names: ['datetime', 'datetime.datetime', 'dt.datetime'],
  convert(call, ctx) {
    const d = dateArgs(call)
    const t = timeArgs(call, 3)
    if (!d || !t) return invalidCall(call, ctx, 'non-integer arguments')
    const bad = invalidDate(d) ?? invalidTime(t)
    if (bad) return invalidCall(call, ctx, bad)
    return ctx.converted(
      call,
      renderDatetime(d, t, tzArg(call, 7, ctx), call, ctx),
      'type.datetime',
    )
  },
}

export const dateHandler: TypeHandler = {
  names: ['date'],
  convert(call, ctx) {
    const d = dateArgs(call)
    if (!d) return invalidCall(call, ctx, 'non-integer arguments')
    const bad = invalidDate(d)
    if (bad) return invalidCall(call, ctx, bad)
    const mode = ctx.opts.datetime
    let result: JsonNode
    if (mode === 'epoch-s' || mode === 'epoch-ms') {
      const ms = utcMillis(d, { hour: 0, minute: 0, second: 0, micro: 0 })
      result = num(String(mode === 'epoch-ms' ? ms : ms / 1000))
    } else if (mode === 'tagged') {
      result = obj([{ key: str('$date'), value: str(isoDate(d)) }])
    } else {
      result = str(isoDate(d))
    }
    return ctx.converted(call, result, 'type.date')
  },
}

export const timeHandler: TypeHandler = {
  names: ['time', 'datetime.time'],
  convert(call, ctx) {
    const t = timeArgs(call, 0)
    if (!t) return invalidCall(call, ctx, 'non-integer arguments')
    const bad = invalidTime(t)
    if (bad) return invalidCall(call, ctx, bad)
    const tz = tzArg(call, 4, ctx)
    const offset = tz && 'offset' in tz ? isoOffset(tz.offset, ctx.opts.datetime === 'iso-z') : ''
    const iso = isoTime(t) + offset
    const result =
      ctx.opts.datetime === 'tagged' ? obj([{ key: str('$time'), value: str(iso) }]) : str(iso)
    return ctx.converted(call, result, 'type.time')
  },
}

/** pandas: Timestamp('2024-01-05 13:30:00', tz='UTC'), Timedelta('1 days 00:00:05'). */
export const pandasHandler: TypeHandler = {
  names: ['Timestamp', 'Timedelta'],
  convert(call, ctx) {
    const text = stringValue(arg(call, 0, 'ts_input')) ?? stringValue(arg(call, 0, 'value'))
    if (text === undefined) return undefined
    if (lastSegment(call.name) === 'Timedelta') {
      const m = /^(-?)(?:(\d+) days? ?)?(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?$/.exec(
        text.trim(),
      )
      if (!m) return ctx.converted(call, str(text), 'type.timedelta')
      const micros =
        BigInt(m[2] ?? 0) * 86_400_000_000n +
        BigInt(m[3]) * 3_600_000_000n +
        BigInt(m[4]) * 60_000_000n +
        BigInt(m[5]) * 1_000_000n +
        BigInt((m[6] ?? '').padEnd(6, '0').slice(0, 6))
      return ctx.converted(call, renderTimedelta(m[1] ? -micros : micros, ctx), 'type.timedelta')
    }
    const parsed = parseDatetimeString(text)
    if (!parsed) return invalidCall(call, ctx, `unrecognised timestamp ${JSON.stringify(text)}`)
    let tz = parsed.tz
    const tzNode = arg(call, -1, 'tz')
    if (tzNode) {
      const resolved = resolveTz(tzNode)
      if (resolved !== 'unknown' && resolved) tz = tz ?? resolved
    }
    const t = parsed.t ?? { hour: 0, minute: 0, second: 0, micro: 0 }
    return ctx.converted(call, renderDatetime(parsed.d, t, tz, call, ctx), 'type.datetime')
  },
}

/** numpy datetime64('2024-01-05T13:30') -> the ISO text as given. */
export const datetime64Handler: TypeHandler = {
  names: ['datetime64'],
  convert(call, ctx) {
    const text = stringValue(arg(call, 0))
    if (text === undefined) return undefined
    return ctx.converted(call, str(text), 'type.datetime')
  },
}
