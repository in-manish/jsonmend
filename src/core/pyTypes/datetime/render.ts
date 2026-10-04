import { type JsonNode, type Node, num, obj, str } from '../../ast'
import type { TransformContext } from '../common'
import {
  type DateParts,
  fixed,
  isoDate,
  isoOffset,
  isoTime,
  type TimeParts,
  type Tz,
  utcMillis,
} from './calendar'
import { zoneOffset } from './zones'

/** Renders a datetime per the `datetime` option. `tz` undefined = naive. */
export function renderDatetime(
  d: DateParts,
  t: TimeParts,
  tz: Tz | undefined,
  node: Node,
  ctx: TransformContext,
): JsonNode {
  let offset: number | undefined
  if (tz && 'zone' in tz) {
    offset = zoneOffset(tz.zone, d, t)
    if (offset === undefined)
      ctx.warn(node, 'type.unknown-zone', `Unknown time zone ${tz.zone}; output is naive`)
  } else if (tz) {
    offset = tz.offset
  }
  const mode = ctx.opts.datetime
  if (mode === 'epoch-s' || mode === 'epoch-ms') {
    if (offset === undefined) {
      ctx.warn(node, 'type.naive-datetime', 'Naive datetime treated as UTC for the epoch timestamp')
    }
    const ms = utcMillis(d, t) - (offset ?? 0) * 60_000
    const micros = BigInt(ms) * 1000n + BigInt(t.micro)
    return num(mode === 'epoch-ms' ? fixed(micros, 3) : fixed(micros, 6))
  }
  const iso = `${isoDate(d)}T${isoTime(t)}${offset === undefined ? '' : isoOffset(offset, mode === 'iso-z')}`
  return mode === 'tagged' ? obj([{ key: str('$datetime'), value: str(iso) }]) : str(iso)
}
