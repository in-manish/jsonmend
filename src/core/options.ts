export type Indent = 2 | 4 | 'tab' | 'none'
export type SortKeys = 'none' | 'asc' | 'desc'
export type DuplicateKeyPolicy = 'last' | 'first' | 'suffix' | 'array'
export type BigNumberMode = 'number' | 'string'
export type NonFiniteMode = 'null' | 'string'
export type DatetimeMode = 'iso' | 'iso-z' | 'epoch-s' | 'epoch-ms' | 'tagged'
export type TimedeltaMode = 'iso' | 'seconds'
export type DecimalMode = 'string' | 'number' | 'tagged'
export type BytesMode = 'base64' | 'utf8' | 'hex' | 'array'
export type SetOrder = 'sorted' | 'insertion'
export type EnumMode = 'name' | 'value' | 'qualified'
export type ComplexMode = 'string' | 'object'
export type ObjectReprMode = 'string' | 'null' | 'placeholder'
export type KeyCoercion = 'source' | 'json'
export type MultipleValues = 'array' | 'jsonl'
export type DanglingKey = 'null' | 'drop'
export type TruncatedString = 'close' | 'drop'

export interface FormatOptions {
  // --- output layout ---
  /** `none` = minified. */
  indent: Indent
  sortKeys: SortKeys
  /** Sort nested objects too; otherwise only the top-level object. */
  sortDeep: boolean
  /** Escape every non-ASCII character as a \u escape (Python's `ensure_ascii`). */
  ensureAscii: boolean
  /** Escape `/ < > &` so the output can be embedded in an HTML `<script>`. */
  htmlSafe: boolean

  // --- keys ---
  /**
   * `last`/`first`: keep one value at the first key's position. `suffix`: rename repeats to
   * `key_2`, `key_3`. `array`: collect all values into an array.
   */
  duplicateKeys: DuplicateKeyPolicy
  /** Non-string keys like `(1, 2)`: keep the source text, or JSON-encode the converted value. */
  keyCoercion: KeyCoercion

  // --- numbers ---
  /** Integers beyond 2^53: keep digit-for-digit as a number, or emit as a string. */
  bigNumbers: BigNumberMode
  /** `NaN` / `Infinity`, which JSON can't represent. */
  nonFinite: NonFiniteMode

  // --- Python / JS types ---
  datetime: DatetimeMode
  timedelta: TimedeltaMode
  decimal: DecimalMode
  bytes: BytesMode
  setOrder: SetOrder
  enumMode: EnumMode
  complex: ComplexMode
  /** `<Foo object at 0x...>` and similar reprs. */
  objectRepr: ObjectReprMode
  /** Add `"__type__": "User"` to objects built from `User(id=1)` style reprs. */
  typeTag: boolean
  /** Rewrite strings that already look like datetimes (`2024-01-05 13:30:00`) to ISO 8601. */
  normalizeDateStrings: boolean

  // --- repair ---
  /** Several top-level values (`{..}{..}`, NDJSON): wrap in an array or emit JSON Lines. */
  multipleValues: MultipleValues
  /** `{"a": 1, "b":` at end of input: give `b` a null value, or drop it. */
  danglingKey: DanglingKey
  /** A string cut off by the end of input: close it, or drop the partial value. */
  truncatedString: TruncatedString
  /** Which payload to format when the text contains several (0-based, -1 = largest). */
  payloadIndex: number

  /** Nesting limit; deeper input fails with a clear error instead of a stack overflow. */
  maxDepth: number
}

export const DEFAULT_OPTIONS: Readonly<FormatOptions> = Object.freeze({
  indent: 2,
  sortKeys: 'none',
  sortDeep: true,
  ensureAscii: false,
  htmlSafe: false,
  duplicateKeys: 'last',
  keyCoercion: 'source',
  bigNumbers: 'number',
  nonFinite: 'null',
  datetime: 'iso',
  timedelta: 'iso',
  decimal: 'string',
  bytes: 'base64',
  setOrder: 'sorted',
  enumMode: 'name',
  complex: 'string',
  objectRepr: 'string',
  typeTag: false,
  normalizeDateStrings: false,
  multipleValues: 'array',
  danglingKey: 'null',
  truncatedString: 'close',
  payloadIndex: -1,
  maxDepth: 10_000,
})

export function resolveOptions(partial: Partial<FormatOptions> = {}): FormatOptions {
  const opts = { ...DEFAULT_OPTIONS }
  for (const key of Object.keys(partial) as (keyof FormatOptions)[]) {
    if (key in DEFAULT_OPTIONS && partial[key] !== undefined) {
      Object.assign(opts, { [key]: partial[key] })
    }
  }
  return opts
}
