/**
 * timedelta(days=1, seconds=5) -> "P1DT5S" (ISO 8601 duration) or total seconds.
 * Arithmetic is done in BigInt microseconds so long durations stay exact.
 */
import { type CallNode, type JsonNode, num, str } from '../../ast'
import { arg, numberValue, type TransformContext, type TypeHandler } from '../common'
import { fixed } from './calendar'
import { invalidCall } from './invalid'

const TD_UNITS: [string, bigint][] = [
  ['days', 86_400_000_000n],
  ['seconds', 1_000_000n],
  ['microseconds', 1n],
  ['milliseconds', 1000n],
  ['minutes', 60_000_000n],
  ['hours', 3_600_000_000n],
  ['weeks', 604_800_000_000n],
]

/** Total microseconds of a `timedelta(...)` call, or undefined when an argument isn't numeric. */
export function timedeltaMicros(call: CallNode): bigint | undefined {
  let total = 0n
  for (const [index, [name, unit]] of TD_UNITS.entries()) {
    const node = arg(call, index, name)
    if (!node) continue
    const value = numberValue(node)
    if (value === undefined || !Number.isFinite(value)) return undefined
    total +=
      Number.isInteger(value) && node.kind === 'number' && !/[.eE]/.test(node.raw)
        ? BigInt(node.raw) * unit
        : BigInt(Math.round(value * Number(unit)))
  }
  return total
}

export function isoDuration(micros: bigint): string {
  if (micros === 0n) return 'PT0S'
  const neg = micros < 0n
  let rest = neg ? -micros : micros
  const days = rest / 86_400_000_000n
  rest %= 86_400_000_000n
  const hours = rest / 3_600_000_000n
  rest %= 3_600_000_000n
  const minutes = rest / 60_000_000n
  rest %= 60_000_000n
  const seconds = fixed(rest, 6)
  let out = `${neg ? '-' : ''}P${days ? `${days}D` : ''}`
  if (hours || minutes || rest) {
    out += `T${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${rest ? `${seconds}S` : ''}`
  }
  return out
}

export function renderTimedelta(micros: bigint, ctx: TransformContext): JsonNode {
  return ctx.opts.timedelta === 'seconds' ? num(fixed(micros, 6)) : str(isoDuration(micros))
}

export const timedeltaHandler: TypeHandler = {
  names: ['timedelta', 'relativedelta_'],
  convert(call, ctx) {
    const micros = timedeltaMicros(call)
    if (micros === undefined) return invalidCall(call, ctx, 'non-numeric arguments')
    return ctx.converted(call, renderTimedelta(micros, ctx), 'type.timedelta')
  },
}
