/** Offsets into the (normalized) input text, `end` exclusive. */
export interface Span {
  start: number
  end: number
}

export type Node = ObjectNode | ArrayNode | StringNode | NumberNode | BooleanNode | NullNode

/**
 * Entries are kept as a list, not a JS object, so key order, duplicate keys and keys like
 * `__proto__` survive untouched until serialization. Keys are nodes because Python dicts
 * allow non-string keys (coerced at serialization time).
 */
export interface ObjectNode {
  kind: 'object'
  entries: Entry[]
  span?: Span
}

export interface Entry {
  key: Node
  value: Node
}

export interface ArrayNode {
  kind: 'array'
  items: Node[]
  span?: Span
}

export interface StringNode {
  kind: 'string'
  value: string
  span?: Span
}

/** `raw` is a valid JSON number token, kept verbatim so big integers never lose precision. */
export interface NumberNode {
  kind: 'number'
  raw: string
  span?: Span
}

export interface BooleanNode {
  kind: 'boolean'
  value: boolean
  span?: Span
}

export interface NullNode {
  kind: 'null'
  span?: Span
}
