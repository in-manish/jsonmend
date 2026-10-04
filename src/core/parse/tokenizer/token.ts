export type TokenKind =
  | 'punct'
  | 'string'
  | 'number'
  | 'ident'
  | 'repr'
  | 'ellipsis'
  | 'unknown'
  | 'eof'

export interface Token {
  kind: TokenKind
  start: number
  end: number
  /**
   * punct/unknown: the character. ident: the (dotted) name. number: a valid JSON number token.
   * string: the decoded value. repr: the source text.
   */
  value: string
  /** A line break separates this token from the previous one. */
  newlineBefore: boolean
  /** Whitespace or a comment separates this token from the previous one. */
  spaceBefore: boolean
  /** Strings: false when the input ended before the closing quote. */
  closed?: boolean
  /** Index of a guess diagnostic about this token, so its output can be highlighted. */
  mark?: number
  /** Strings with a `b` prefix. */
  bytes?: Uint8Array
  /** Numbers with a `j` suffix (Python imaginary literal). */
  imaginary?: boolean
}
