/**
 * Mapping wrappers -> object.
 *
 *   OrderedDict([('a', 1), ('b', 2)])          -> {"a": 1, "b": 2}
 *   defaultdict(<class 'list'>, {'a': [1]})    -> {"a": [1]}
 *   Counter({'x': 2})   dict(a=1)   SimpleNamespace(a=1)   mappingproxy({...})
 */
import { type Entry, type Node, obj, str } from '../ast'
import type { TypeHandler } from './common'

/** Entries from a dict literal or an iterable of 2-item pairs. */
function entriesOf(node: Node): Entry[] | undefined {
  if (node.kind === 'object') return node.entries
  if (node.kind === 'array') {
    const pairs: Entry[] = []
    for (const item of node.items) {
      if (item.kind !== 'array' || item.items.length !== 2) return undefined
      pairs.push({ key: item.items[0], value: item.items[1] })
    }
    return pairs
  }
  return undefined
}

export const mappingHandler: TypeHandler = {
  names: [
    'dict',
    'OrderedDict',
    'defaultdict',
    'Counter',
    'ChainMap',
    'mappingproxy',
    'SimpleNamespace',
    'Namespace',
    'frozendict',
    'immutabledict',
    'MappingProxyType',
    'CaseInsensitiveDict',
    'Box',
    'AttrDict',
  ],
  convert(call, ctx) {
    // defaultdict's first argument is the default factory; the mapping is the last positional.
    const source = call.name.endsWith('defaultdict') ? call.args.at(-1) : call.args[0]
    const entries: Entry[] = []
    if (source && !(call.name.endsWith('defaultdict') && call.args.length < 2)) {
      const fromSource = entriesOf(source)
      if (!fromSource) return undefined
      entries.push(...fromSource)
    }
    for (const kw of call.kwargs) entries.push({ key: str(kw.name), value: kw.value })
    const result = ctx.convert(obj(entries, call.span))
    return ctx.converted(call, result, 'type.mapping', { highlight: false })
  },
}
