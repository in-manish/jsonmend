import { describe, expect, it } from 'vitest'
import { convert, MODES, parseUrl, type UrlMode } from '../../src/core/url/codec'

const out = (r: ReturnType<typeof convert>) => (r.ok ? r.output : `ERR ${r.error}`)

describe('url codec', () => {
  it('decodes percent-encoded URLs', () => {
    expect(out(convert('decode', 'component', 'https%3A%2F%2Fa.com%2Fx%3Fq%3Dhello%20world'))).toBe(
      'https://a.com/x?q=hello world',
    )
    expect(out(convert('decode', 'uri', 'https://a.com/a%20b%2Fc'))).toBe('https://a.com/a b%2Fc')
  })

  it('treats + as a space only in form mode', () => {
    expect(out(convert('decode', 'form', 'a+b%2Bc'))).toBe('a b+c')
    expect(out(convert('decode', 'component', 'a+b'))).toBe('a+b')
    expect(out(convert('encode', 'form', 'a b&c'))).toBe('a+b%26c')
  })

  it('decodes double-encoded input only when repeating', () => {
    expect(out(convert('decode', 'component', 'a%2520b'))).toBe('a%20b')
    const r = convert('decode', 'component', 'a%2520b', true)
    expect(r).toEqual({ ok: true, output: 'a b', passes: 2 })
  })

  it('reports malformed percent sequences and bad UTF-8', () => {
    expect(out(convert('decode', 'component', '100%'))).toContain('position 4')
    expect(out(convert('decode', 'component', '%E0%A4%A'))).toContain('Malformed')
    expect(out(convert('decode', 'component', '%FF'))).toContain('not valid UTF-8')
  })

  it('handles Base64 in both alphabets with unicode text', () => {
    expect(out(convert('encode', 'base64', 'héllo ✓'))).toBe('aMOpbGxvIOKckw==')
    expect(out(convert('decode', 'base64', 'aMOpbGxvIOKckw=='))).toBe('héllo ✓')
    expect(out(convert('encode', 'base64url', '??>>'))).toBe('Pz8-Pg')
    expect(out(convert('decode', 'base64url', 'Pz8-Pg'))).toBe('??>>')
    expect(out(convert('decode', 'base64', 'not base64!'))).toContain('Not valid Base64')
  })

  it('round-trips arbitrary text in every mode', () => {
    const sample = 'https://x.io/a b?q=ü&r=1+1#frag ✓\n'
    for (const { id } of MODES) {
      const encoded = convert('encode', id as UrlMode, sample)
      expect(encoded.ok).toBe(true)
      if (!encoded.ok) continue
      if (id === 'uri') continue // encodeURI keeps %-sequences ambiguous only for reserved chars
      expect(out(convert('decode', id as UrlMode, encoded.output))).toBe(sample)
    }
  })

  it('splits a URL into parts', () => {
    const p = parseUrl('https://u:p@a.com:8080/x/y?a=1&b=two%20words#top')
    expect(p).toMatchObject({
      protocol: 'https:',
      host: 'a.com',
      port: '8080',
      path: '/x/y',
      hash: '#top',
    })
    expect(p?.query).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'two words' },
    ])
    expect(parseUrl('not a url')).toBeUndefined()
  })
})
