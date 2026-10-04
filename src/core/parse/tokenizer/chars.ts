/** Character classes and patterns shared by the tokenizer modules. */

export const PUNCT = new Set(['{', '}', '[', ']', '(', ')', ',', ':', '=', ';', '+', '-', '*', '.'])

/** Characters after a closing quote that confirm it really closes the string. */
export const DELIMITERS = new Set([',', ':', '}', ']', ')', '\n', '\r', ';', '=', '+', '#'])

/** Unicode whitespace and invisible characters that commonly sneak in via copy-paste. */
export const isOddSpace = (c: number) =>
  c === 0xa0 ||
  c === 0x1680 ||
  c === 0x180e ||
  (c >= 0x2000 && c <= 0x200d) ||
  c === 0x2028 ||
  c === 0x2029 ||
  c === 0x202f ||
  c === 0x205f ||
  c === 0x2060 ||
  c === 0x3000 ||
  c === 0xfeff

/** `"` `'` and backtick close themselves; curly quotes close with any quote of their family. */
export type QuoteFamily = '"' | "'" | '`' | 'curly2' | 'curly1'

export const quoteFamily = (c: number): QuoteFamily | undefined => {
  switch (c) {
    case 0x22:
      return '"'
    case 0x27:
      return "'"
    case 0x60:
      return '`'
    case 0x201c:
    case 0x201d:
    case 0x201e:
    case 0x201f:
    case 0x2033:
      return 'curly2'
    case 0x2018:
    case 0x2019:
    case 0x201a:
    case 0x201b:
    case 0x2032:
      return 'curly1'
    default:
      return undefined
  }
}

export const IDENT_RE = /[\p{L}_$][\p{L}\p{N}_$]*/uy
export const STRING_PREFIX_RE = /^(?:[rRuUbBfF]|[rR][bBfF]|[bBfF][rR])$/
export const HEX_RE = /^[0-9a-fA-F]+$/
/** Lines that look like the start of a new key or the end of a container. */
export const NEW_ENTRY_RE =
  /^[ \t]*(?:["'][^"'\n]*["'][ \t]*:|[\p{L}_$][\p{L}\p{N}_$]*[ \t]*:|[}\])]|$)/u

export const SHORT_ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  a: String.fromCharCode(7),
  '\\': '\\',
  "'": "'",
  '"': '"',
  '`': '`',
  '/': '/',
}

export const isDigit = (c: number) => c >= 0x30 && c <= 0x39
