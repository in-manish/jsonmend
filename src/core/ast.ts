/** Offsets into the original input text, `end` exclusive. */
export interface Span {
  start: number
  end: number
}

interface Base {
  span?: Span
  /** Index of a diagnostic whose output location is this whole node (for highlighting). */
  mark?: number
}

/** Nodes that map directly onto JSON. Serialization only accepts these. */
export type JsonNode = ObjectNode | ArrayNode | StringNode | NumberNode | BooleanNode | NullNode

/** Everything the lenient parser can produce; the transform stage turns these into JsonNodes. */
export type Node =
  | JsonNode
  | CallNode
  | NameNode
  | ReprNode
  | BytesNode
  | NonFiniteNode
  | ComplexNode

/**
 * Entries are kept as a list, not a JS object, so key order, duplicate keys and keys like
 * `__proto__` survive untouched until serialization. Keys are nodes because Python dicts
 * allow non-string keys (coerced at serialization time).
 */
export interface ObjectNode extends Base {
  kind: 'object'
  entries: Entry[]
  /** Diagnostic index when the closing `}` was added by repair. */
  closerMark?: number
}

export interface Entry {
  key: Node
  value: Node
}

export interface ArrayNode extends Base {
  kind: 'array'
  items: Node[]
  /** Source container form; `lines` is the root of a multi-value (JSON Lines) document. */
  form?: 'list' | 'tuple' | 'set' | 'lines'
  closerMark?: number
}

export interface StringNode extends Base {
  kind: 'string'
  value: string
}

/** `raw` is a valid JSON number token, kept verbatim so big integers never lose precision. */
export interface NumberNode extends Base {
  kind: 'number'
  raw: string
}

export interface BooleanNode extends Base {
  kind: 'boolean'
  value: boolean
}

export interface NullNode extends Base {
  kind: 'null'
}

/** `Name(args, key=value)`, e.g. `datetime.datetime(2024, 1, 5)` or `User(id=1)`. */
export interface CallNode extends Base {
  kind: 'call'
  /** Dotted name as written, e.g. `datetime.datetime`. */
  name: string
  args: Node[]
  kwargs: Kwarg[]
}

export interface Kwarg {
  name: string
  value: Node
}

/** A bare identifier or dotted name used as a value, e.g. `datetime.timezone.utc`. */
export interface NameNode extends Base {
  kind: 'name'
  name: string
}

/** `<...>` reprs, `...` and cyclic markers like `[...]`; `text` is the source text. */
export interface ReprNode extends Base {
  kind: 'repr'
  text: string
}

export interface BytesNode extends Base {
  kind: 'bytes'
  bytes: Uint8Array
}

export interface NonFiniteNode extends Base {
  kind: 'nonfinite'
  value: 'NaN' | 'Infinity' | '-Infinity'
}

/** Python complex literal; `re` and `im` are JSON number tokens. */
export interface ComplexNode extends Base {
  kind: 'complex'
  re: string
  im: string
}

export const isJsonNode = (node: Node): node is JsonNode =>
  node.kind === 'object' ||
  node.kind === 'array' ||
  node.kind === 'string' ||
  node.kind === 'number' ||
  node.kind === 'boolean' ||
  node.kind === 'null'

export const str = (value: string, span?: Span): StringNode => ({ kind: 'string', value, span })
export const num = (raw: string, span?: Span): NumberNode => ({ kind: 'number', raw, span })
export const nul = (span?: Span): NullNode => ({ kind: 'null', span })
export const arr = (items: Node[], span?: Span): ArrayNode => ({ kind: 'array', items, span })
export const obj = (entries: Entry[], span?: Span): ObjectNode => ({
  kind: 'object',
  entries,
  span,
})
