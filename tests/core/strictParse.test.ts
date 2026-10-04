import { describe, expect, it } from 'vitest'
import { ParseError, parseStrictJson } from '../../src/core'

const errorAt = (text: string) => {
  try {
    parseStrictJson(text)
  } catch (e) {
    if (e instanceof ParseError) return { message: e.message, offset: e.offset }
    throw e
  }
  throw new Error(`expected ${text} to fail`)
}

describe('parseStrictJson', () => {
  it('keeps raw number tokens', () => {
    expect(parseStrictJson('12345678901234567890')).toMatchObject({
      kind: 'number',
      raw: '12345678901234567890',
    })
  })

  it('keeps duplicate keys and their order', () => {
    const node = parseStrictJson('{"a":1,"a":2}')
    expect(node.kind === 'object' && node.entries.map((e) => e.value)).toMatchObject([
      { raw: '1' },
      { raw: '2' },
    ])
  })

  it('records spans', () => {
    const node = parseStrictJson(' {"a": [1]} ')
    expect(node.span).toEqual({ start: 1, end: 11 })
  })

  it.each([
    ["{'a': 1}", 1, 'Expected a double-quoted key but found "\'"'],
    ['{"a" 1}', 5, 'Expected \':\' after key but found "1"'],
    ['[1 2]', 3, "Expected ',' or ']' but found \"2\""],
    ['[1,]', 3, 'Expected a JSON value but found "]"'],
    ['{"a":1', 6, 'Unexpected end of input'],
    ['"abc', 0, 'Unterminated string'],
    ['01', 1, 'Expected end of input after the top-level value but found "1"'],
    ['1 2', 2, 'Expected end of input after the top-level value but found "2"'],
    ['tru', 0, 'Unexpected token "t"'],
    ['"bad \\x"', 0, 'Invalid escape sequence in string'],
    ['"tab\there"', 4, 'Unescaped control character in string'],
    ['NaN', 0, 'Expected a JSON value but found "N"'],
  ])('rejects %j at offset %i', (text, offset, message) => {
    expect(errorAt(text)).toEqual({ offset, message })
  })

  it('enforces the depth limit with a clear error', () => {
    expect(() => parseStrictJson('[[[1]]]', 3)).not.toThrow()
    expect(() => parseStrictJson('[[[1]]]', 2)).toThrow('Nesting is deeper than the 2-level limit')
  })

  it('handles the default 10,000-level depth without overflowing the stack', () => {
    const deep = `${'['.repeat(10_000)}${']'.repeat(10_000)}`
    expect(() => parseStrictJson(deep)).not.toThrow()
    expect(() => parseStrictJson(`[${deep}]`)).toThrow(ParseError)
  })
})
