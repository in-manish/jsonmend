const SHORT_ESCAPES: Record<number, string> = {
  8: '\\b',
  9: '\\t',
  10: '\\n',
  12: '\\f',
  13: '\\r',
  34: '\\"',
  92: '\\\\',
}

const hex = (c: number) => `\\u${c.toString(16).padStart(4, '0')}`

/** JSON string literal. Lone surrogates are always escaped so the output is valid UTF-8. */
export function quote(s: string, ensureAscii = false, htmlSafe = false): string {
  let out = '"'
  let last = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    let esc: string | undefined
    if (c < 0x20 || c === 0x22 || c === 0x5c) {
      esc = SHORT_ESCAPES[c] ?? hex(c)
    } else if (c >= 0xd800 && c <= 0xdfff) {
      const paired = c <= 0xdbff && (s.charCodeAt(i + 1) & 0xfc00) === 0xdc00
      if (!paired) {
        esc = hex(c)
      } else {
        if (ensureAscii) {
          out += s.slice(last, i) + hex(c) + hex(s.charCodeAt(i + 1))
          last = i + 2
        }
        i++
        continue
      }
    } else if (ensureAscii && c > 0x7e) {
      esc = hex(c)
    } else if (htmlSafe) {
      if (c === 0x2f) esc = '\\/'
      else if (c === 0x3c || c === 0x3e || c === 0x26) esc = hex(c)
    }
    if (esc !== undefined) {
      out += s.slice(last, i) + esc
      last = i + 1
    }
  }
  return `${out + s.slice(last)}"`
}
