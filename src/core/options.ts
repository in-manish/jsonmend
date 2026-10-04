export type Indent = 2 | 4 | 'tab' | 'none'
export type SortKeys = 'none' | 'asc' | 'desc'
export type DuplicateKeyPolicy = 'last' | 'first' | 'suffix' | 'array'
export type BigNumberMode = 'number' | 'string'

export interface FormatOptions {
  /** `none` = minified. */
  indent: Indent
  sortKeys: SortKeys
  /** Sort nested objects too; otherwise only the top-level object. */
  sortDeep: boolean
  /**
   * `last`/`first`: keep one value at the first key's position. `suffix`: rename repeats to
   * `key_2`, `key_3`. `array`: collect all values into an array.
   */
  duplicateKeys: DuplicateKeyPolicy
  /** Escape every non-ASCII character as `\uXXXX` (Python's `ensure_ascii`). */
  ensureAscii: boolean
  /** Escape `/ < > &` so the output can be embedded in HTML `<script>`. */
  htmlSafe: boolean
  /** Integers beyond ±2^53: keep digit-for-digit as a number, or emit as a string. */
  bigNumbers: BigNumberMode
  /** Nesting limit; deeper input fails with a clear error instead of a stack overflow. */
  maxDepth: number
}

export const DEFAULT_OPTIONS: Readonly<FormatOptions> = Object.freeze({
  indent: 2,
  sortKeys: 'none',
  sortDeep: true,
  duplicateKeys: 'last',
  ensureAscii: false,
  htmlSafe: false,
  bigNumbers: 'number',
  maxDepth: 10_000,
})

export function resolveOptions(partial: Partial<FormatOptions> = {}): FormatOptions {
  const opts = { ...DEFAULT_OPTIONS }
  for (const key of Object.keys(partial) as (keyof FormatOptions)[]) {
    if (partial[key] !== undefined) Object.assign(opts, { [key]: partial[key] })
  }
  return opts
}
