/**
 * Value types whose repr wraps a single string; they all become that string.
 *
 *   UUID('12345678-1234-5678-1234-567812345678') -> "12345678-1234-5678-1234-567812345678"
 *   PosixPath('/a/b') -> "/a/b"     ObjectId('65a1...') -> "65a1..."     IPv4Address('10.0.0.1') -> "10.0.0.1"
 */
import { str } from '../ast'
import { arg, lastSegment, stringValue, type TypeHandler } from './common'

const UUID_RE =
  /^(?:urn:uuid:)?\{?[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}\}?$/i

export const uuidHandler: TypeHandler = {
  names: ['UUID'],
  convert(call, ctx) {
    const text = stringValue(arg(call, 0, 'hex'))
    if (text === undefined) return undefined
    if (!UUID_RE.test(text))
      ctx.warn(call, 'type.invalid-uuid', `${JSON.stringify(text)} is not a valid UUID`)
    return ctx.converted(call, str(text), 'type.uuid')
  },
}

const PATHS = ['Path', 'PosixPath', 'WindowsPath', 'PurePath', 'PurePosixPath', 'PureWindowsPath']

export const pathHandler: TypeHandler = {
  names: PATHS,
  convert(call, ctx) {
    const parts = call.args.map(stringValue)
    if (parts.length === 0 || parts.some((p) => p === undefined)) return undefined
    const sep = lastSegment(call.name).includes('Windows') ? '\\' : '/'
    return ctx.converted(call, str(parts.join(sep)), 'type.path')
  },
}

const STRING_WRAPPERS = [
  'ObjectId',
  'IPv4Address',
  'IPv6Address',
  'IPv4Network',
  'IPv6Network',
  'IPv4Interface',
  'IPv6Interface',
  'URL',
  'Url',
  'HttpUrl',
  'AnyUrl',
  'SecretStr',
  'EmailStr',
  'str_',
  'Markup',
  'PurePosixPath',
]

export const stringWrapperHandler: TypeHandler = {
  names: STRING_WRAPPERS,
  convert(call, ctx) {
    const text = stringValue(arg(call, 0))
    if (text === undefined) return undefined
    return ctx.converted(call, str(text), 'type.string-wrapper')
  },
}
