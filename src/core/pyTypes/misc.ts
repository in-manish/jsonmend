/**
 *   complex(1, 2) / 1+2j -> "1+2j" (default) or {"re": 1, "im": 2}
 *   range(1, 5) -> [1, 2, 3, 4] (up to 1000 items) or {"start": 1, "stop": 5, "step": 1}
 *   Fraction(1, 3) -> "1/3"      re.compile('a+') -> "a+"
 */
import { arr, type ComplexNode, type JsonNode, num, obj, str } from '../ast'
import { arg, intValue, stringValue, type TransformContext, type TypeHandler } from './common'

export function complexToJson(node: ComplexNode, ctx: TransformContext): JsonNode {
  let result: JsonNode
  if (ctx.opts.complex === 'object') {
    result = obj([
      { key: str('re'), value: num(node.re) },
      { key: str('im'), value: num(node.im) },
    ])
  } else {
    const im = `${node.im.startsWith('-') ? '' : '+'}${node.im}j`
    result = str(node.re === '0' ? `${node.im}j` : `${node.re}${im}`)
  }
  return ctx.converted(node, result, 'type.complex')
}

export const complexHandler: TypeHandler = {
  names: ['complex'],
  convert(call, ctx) {
    const re = arg(call, 0, 'real')
    const im = arg(call, 1, 'imag')
    const raw = (n: typeof re) => (n === undefined ? '0' : n.kind === 'number' ? n.raw : undefined)
    const r = raw(re)
    const i = raw(im)
    if (r === undefined || i === undefined) return undefined
    return complexToJson({ kind: 'complex', re: r, im: i, span: call.span }, ctx)
  },
}

const MAX_RANGE = 1000

export const rangeHandler: TypeHandler = {
  names: ['range'],
  convert(call, ctx) {
    const a = intValue(call.args[0])
    const b = intValue(call.args[1])
    const step = call.args[2] ? intValue(call.args[2]) : 1
    if (a === undefined || step === undefined || step === 0) return undefined
    const [start, stop] = b === undefined ? [0, a] : [a, b]
    const length = Math.max(0, Math.ceil((stop - start) / step))
    if (length > MAX_RANGE) {
      const n = (v: number) => num(String(v))
      const result = obj([
        { key: str('start'), value: n(start) },
        { key: str('stop'), value: n(stop) },
        { key: str('step'), value: n(step) },
      ])
      return ctx.converted(call, result, 'type.range')
    }
    const items = Array.from({ length }, (_, k) => num(String(start + k * step)))
    return ctx.converted(call, arr(items), 'type.range')
  },
}

export const fractionHandler: TypeHandler = {
  names: ['Fraction'],
  convert(call, ctx) {
    const n = call.args[0]
    const d = call.args[1]
    if (n?.kind === 'string') return ctx.converted(call, str(n.value), 'type.fraction')
    if (n?.kind !== 'number') return undefined
    const text = d?.kind === 'number' ? `${n.raw}/${d.raw}` : n.raw
    return ctx.converted(call, str(text), 'type.fraction')
  },
}

export const regexHandler: TypeHandler = {
  names: ['compile', 'Pattern'],
  convert(call, ctx) {
    const pattern = stringValue(arg(call, 0, 'pattern'))
    if (pattern === undefined) return undefined
    return ctx.converted(call, str(pattern), 'type.regex')
  },
}
