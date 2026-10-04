/**
 * (1, 2) / tuple([...]) / list(...) / deque([...], maxlen=3) -> array.
 */
import { arr } from '../ast'
import { arg, type TypeHandler } from './common'
import { iterableItems } from './set'

export const sequenceHandler: TypeHandler = {
  names: ['tuple', 'list', 'deque', 'frozenlist', 'FrozenList'],
  convert(call, ctx) {
    const items = iterableItems(arg(call, 0, 'iterable'))
    if (!items) return undefined
    return ctx.converted(call, arr(items.map((i) => ctx.convert(i))), 'type.sequence', {
      highlight: false,
    })
  },
}
