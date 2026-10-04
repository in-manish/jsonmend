import { HEX_RE, SHORT_ESCAPES } from './chars'
import type { ScanSource } from './source'

export function readEscape(s: ScanSource, i: number, emit: (s: string) => void): number {
  const { text } = s
  const next = text[i + 1]
  const short = SHORT_ESCAPES[next]
  if (short !== undefined) {
    emit(short)
    return i + 2
  }
  if (next === '\n') return i + 2
  if (next === '\r') return text[i + 2] === '\n' ? i + 3 : i + 2
  if (next >= '0' && next <= '7') {
    let j = i + 1
    while (j < i + 4 && text[j] >= '0' && text[j] <= '7') j++
    emit(String.fromCharCode(Number.parseInt(text.slice(i + 1, j), 8)))
    return j
  }
  const hexEscape = (len: number) => {
    const digits = text.slice(i + 2, i + 2 + len)
    if (digits.length !== len || !HEX_RE.test(digits)) return undefined
    return Number.parseInt(digits, 16)
  }
  if (next === 'x') {
    const code = hexEscape(2)
    if (code !== undefined) {
      emit(String.fromCharCode(code))
      return i + 4
    }
  } else if (next === 'u') {
    if (text[i + 2] === '{') {
      const close = text.indexOf('}', i + 3)
      const digits = close === -1 ? '' : text.slice(i + 3, close)
      if (digits && HEX_RE.test(digits) && Number.parseInt(digits, 16) <= 0x10ffff) {
        emit(String.fromCodePoint(Number.parseInt(digits, 16)))
        return close + 1
      }
    }
    const code = hexEscape(4)
    if (code !== undefined) {
      emit(String.fromCharCode(code))
      return i + 6
    }
  } else if (next === 'U') {
    const code = hexEscape(8)
    if (code !== undefined && code <= 0x10ffff) {
      emit(String.fromCodePoint(code))
      return i + 10
    }
  }
  // Unknown escape: Python keeps both characters.
  emit(`\\${next}`)
  return i + 2
}
