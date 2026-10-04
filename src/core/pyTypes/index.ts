/** The type registry: maps call names to handlers. */

import { bytesHandler } from './bytes'
import { mappingHandler } from './collections'
import type { TypeHandler } from './common'
import {
  dateHandler,
  datetime64Handler,
  datetimeHandler,
  pandasHandler,
  timedeltaHandler,
  timeHandler,
} from './datetime'
import { decimalHandler } from './decimal'
import { complexHandler, fractionHandler, rangeHandler, regexHandler } from './misc'
import { numpyArrayHandler, numpyScalarHandler } from './numpy'
import { setHandler } from './set'
import { sequenceHandler } from './tuple'
import { pathHandler, stringWrapperHandler, uuidHandler } from './uuid'

export { bytesToJson } from './bytes'
export type { TransformContext, TypeHandler } from './common'
export { normalizeDateString } from './datetime'
export { enumToJson } from './enum'
export { reprToJson, unknownCallToJson } from './fallbackRepr'
export { complexToJson } from './misc'
export { setToJson } from './set'

const HANDLERS: TypeHandler[] = [
  datetimeHandler,
  dateHandler,
  timeHandler,
  timedeltaHandler,
  pandasHandler,
  datetime64Handler,
  decimalHandler,
  uuidHandler,
  pathHandler,
  stringWrapperHandler,
  bytesHandler,
  setHandler,
  sequenceHandler,
  mappingHandler,
  numpyScalarHandler,
  numpyArrayHandler,
  complexHandler,
  rangeHandler,
  fractionHandler,
  regexHandler,
]

const REGISTRY = new Map<string, TypeHandler>()
for (const handler of HANDLERS) {
  for (const name of handler.names) if (!REGISTRY.has(name)) REGISTRY.set(name, handler)
}

/** Full dotted name first (`datetime.time`), then its last segment (`time`). */
export function findHandler(name: string): TypeHandler | undefined {
  return REGISTRY.get(name) ?? REGISTRY.get(name.slice(name.lastIndexOf('.') + 1))
}
