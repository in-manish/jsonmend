/**
 * Decimal('1.50') -> "1.50" (lossless string, default), 1.50 (number) or {"$decimal": "1.50"}.
 * Decimal('NaN') / Decimal('Infinity') follow the nonFinite option.
 */
import { type JsonNode, num, obj, str } from '../ast'
import { arg, type TypeHandler, toJsonNumber } from './common'

export const decimalHandler: TypeHandler = {
  names: ['Decimal'],
  convert(call, ctx) {
    const value = arg(call, 0, 'value')
    let text: string | undefined
    if (value?.kind === 'string') text = value.value.trim()
    else if (value?.kind === 'number') text = value.raw
    else if (!value) text = '0'
    if (text === undefined) return undefined

    const special = /^([+-]?)(s?nan|inf(?:inity)?)$/i.exec(text)
    if (special) {
      const isNan = /nan/i.test(special[2])
      return ctx.convert({
        kind: 'nonfinite',
        value: isNan ? 'NaN' : special[1] === '-' ? '-Infinity' : 'Infinity',
        span: call.span,
      })
    }
    const raw = toJsonNumber(text)
    if (raw === undefined) {
      ctx.warn(
        call,
        'type.invalid-decimal',
        `Invalid Decimal ${JSON.stringify(text)}; kept as a string`,
      )
      return str(text)
    }
    let result: JsonNode
    if (ctx.opts.decimal === 'number') result = num(raw)
    else if (ctx.opts.decimal === 'tagged')
      result = obj([{ key: str('$decimal'), value: str(text) }])
    else result = str(text)
    return ctx.converted(call, result, 'type.decimal')
  },
}
