/**
 * numpy scalars and arrays -> native numbers / arrays.
 *
 *   np.int64(5) -> 5     np.float32(1.5) -> 1.5     np.str_('x') -> "x"
 *   array([1, 2], dtype=int64) -> [1, 2]      array.array('i', [1, 2]) -> [1, 2]
 */
import { arg, type TypeHandler } from './common'

const SCALARS = [
  'int8',
  'int16',
  'int32',
  'int64',
  'uint8',
  'uint16',
  'uint32',
  'uint64',
  'float16',
  'float32',
  'float64',
  'float96',
  'float128',
  'longdouble',
  'float_',
  'int_',
  'intc',
  'intp',
  'uint',
  'bool_',
  'bool',
  'complex64',
  'complex128',
  'double',
  'single',
  'half',
  'short',
  'longlong',
]

export const numpyScalarHandler: TypeHandler = {
  names: SCALARS,
  convert(call, ctx) {
    const value = arg(call, 0)
    if (!value) return undefined
    return ctx.converted(call, ctx.convert(value), 'type.numpy', { highlight: false })
  },
}

export const numpyArrayHandler: TypeHandler = {
  names: [
    'array',
    'ndarray',
    'asarray',
    'matrix',
    'masked_array',
    'MaskedArray',
    'Series',
    'Index',
  ],
  convert(call, ctx) {
    // array.array('i', [1, 2]) has a type code first.
    const first = arg(call, 0, 'data')
    const value = first?.kind === 'string' && call.args[1] ? call.args[1] : first
    if (!value) return undefined
    return ctx.converted(call, ctx.convert(value), 'type.numpy', { highlight: false })
  },
}
