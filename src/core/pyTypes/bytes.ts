/**
 * b'abc' / bytearray(b'abc') / bytes([97, 98]) -> per the bytes option:
 * base64 "YWJj" (default), utf8 "abc", hex "616263", or array [97, 98, 99].
 */
import { arr, type BytesNode, type JsonNode, type Node, num, str } from '../ast'
import { arg, intValue, type TransformContext, type TypeHandler } from './common'

export function bytesToJson(node: BytesNode, ctx: TransformContext): JsonNode {
  const { bytes } = node
  let result: JsonNode
  switch (ctx.opts.bytes) {
    case 'utf8': {
      try {
        result = str(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      } catch {
        ctx.warn(node, 'type.bytes-not-utf8', 'Bytes are not valid UTF-8; used base64 instead')
        result = str(base64(bytes))
      }
      break
    }
    case 'hex':
      result = str(Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''))
      break
    case 'array':
      result = arr(Array.from(bytes, (b) => num(String(b))))
      break
    default:
      result = str(base64(bytes))
  }
  return ctx.converted(node, result, 'type.bytes')
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function toBytes(node: Node | undefined): Uint8Array | undefined {
  if (!node) return new Uint8Array()
  if (node.kind === 'bytes') return node.bytes
  if (node.kind === 'string') return new TextEncoder().encode(node.value)
  if (node.kind === 'array') {
    const values = node.items.map(intValue)
    if (values.every((v): v is number => v !== undefined && v >= 0 && v <= 255)) {
      return Uint8Array.from(values)
    }
  }
  return undefined
}

export const bytesHandler: TypeHandler = {
  names: ['bytes', 'bytearray', 'memoryview', 'bytes_'],
  convert(call, ctx) {
    const bytes = toBytes(arg(call, 0, 'source'))
    if (!bytes) return undefined
    return bytesToJson({ kind: 'bytes', bytes, span: call.span }, ctx)
  },
}
