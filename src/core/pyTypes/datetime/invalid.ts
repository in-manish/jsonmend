import { type CallNode, type JsonNode, str } from '../../ast'
import type { TransformContext } from '../common'

/** Invalid datetime arguments: warn and keep the source text. */
export const invalidCall = (call: CallNode, ctx: TransformContext, reason: string): JsonNode => {
  ctx.warn(call, 'type.invalid-datetime', `Invalid ${call.name}: ${reason}; kept the source text`)
  return str(ctx.snippet(call.span))
}
