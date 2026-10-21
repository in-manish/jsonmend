import { describe, expect, it } from 'vitest'
import { CLIP_BYTES, simulateGmail } from '../../src/core/html/email/gmail'

const gmail = (html: string, account: 'gmail' | 'other' = 'gmail', dark = false) =>
  simulateGmail(html, { account, dark })

describe('simulateGmail', () => {
  it('removes scripts, forms, handlers and javascript links, and says so', () => {
    const r = gmail(
      '<p onclick="x()">Hi</p><script>alert(1)</script><form><input name=a><button>Go</button></form><a href="javascript:evil()">l</a>',
    )
    expect(r.html).not.toMatch(/<script|<form|<input|<button|onclick|javascript:/i)
    expect(r.html).toContain('<p>Hi</p>')
    const messages = r.notes.map((n) => n.message).join('\n')
    expect(messages).toContain('<script> is removed')
    expect(messages).toContain('Form elements')
    expect(messages).toContain('Event handlers')
    expect(messages).toContain('javascript:')
  })

  it('keeps <style> for Google accounts but drops position, @import and @font-face', () => {
    const r = gmail(
      '<style>@import url(x.css);@font-face{font-family:a}.a{color:red;position:absolute;z-index:9}</style><p class="a">x</p>',
    )
    expect(r.html).toContain('color:red')
    expect(r.html).not.toMatch(/position|z-index|@import|@font-face/)
    expect(r.notes.map((n) => n.message).join('\n')).toContain('"position" is removed')
  })

  it('ignores <style> entirely for other accounts and warns', () => {
    const r = gmail('<style>.a{color:red}</style><p class="a" style="color:blue">x</p>', 'other')
    expect(r.html).not.toContain('color:red')
    expect(r.html).toContain('color:blue')
    expect(r.html).not.toContain('class=')
    expect(r.notes.some((n) => n.severity === 'error' && n.message.includes('non-Google'))).toBe(
      true,
    )
  })

  it('strips position from inline styles without touching background-position', () => {
    const r = gmail('<div style="background-position:0 0;position:fixed;color:red">x</div>')
    expect(r.html).toContain('background-position:0 0')
    expect(r.html).toContain('color:red')
    expect(r.html).not.toMatch(/[;"]position:fixed/)
  })

  it('takes the subject from <title> and flattens html/head/body', () => {
    const r = gmail(
      '<!doctype html><html><head><title>Sale!</title></head><body><p>x</p></body></html>',
    )
    expect(r.subject).toBe('Sale!')
    expect(r.html).not.toMatch(/<title|<head|<html>/)
  })

  it('clips messages over 102 KB', () => {
    const r = gmail(`<p>${'a'.repeat(CLIP_BYTES + 10)}</p>`)
    expect(r.clipped).toBe(true)
    expect(r.html).toContain('View entire message')
    expect(r.notes.some((n) => n.message.includes('clips'))).toBe(true)
  })

  it('adds the dark approximation only when asked', () => {
    expect(gmail('<p>x</p>', 'gmail', true).html).toContain('invert(1)')
    expect(gmail('<p>x</p>').html).not.toContain('invert(1)')
  })
})
