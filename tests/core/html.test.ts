import { describe, expect, it } from 'vitest'
import { applyEdits, formatHtml } from '../../src/core/html/format'

const squash = (s: string) => s.replace(/\s+/g, '')
const codes = (src: string, template: 'on' | 'off' | 'auto' = 'on') =>
  formatHtml(src, { template }).issues.map((i) => i.code)

describe('formatHtml', () => {
  it('indents nested blocks and keeps short inline content on one line', () => {
    const r = formatHtml('<div><ul><li>One</li><li>Two <b>bold</b></li></ul></div>')
    expect(r.output).toBe(
      '<div>\n  <ul>\n    <li>One</li>\n    <li>Two <b>bold</b></li>\n  </ul>\n</div>\n',
    )
  })

  it('is idempotent', () => {
    const src =
      '<!doctype html><html><head><title>T</title><style>a{color:red}</style></head><body><p>Hello <a href="x">world</a>, bye.</p><br><img src=a.png></body></html>'
    const once = formatHtml(src).output
    expect(formatHtml(once).output).toBe(once)
  })

  it('leaves pre and script bodies alone and handles void tags', () => {
    const src = '<div><pre>a\n   b</pre><script>var a = 1;\nvar b = `x\n y`</script><br><hr></div>'
    const r = formatHtml(src)
    expect(r.output).toContain('<pre>a\n   b</pre>')
    expect(r.output).toContain('var b = `x\n y`')
    expect(squash(r.output)).toBe(squash(src))
  })

  it('wraps long text at the width without splitting words', () => {
    const r = formatHtml(`<p>${'word '.repeat(40)}</p>`, { width: 40 })
    for (const line of r.output.split('\n')) expect(line.length).toBeLessThanOrEqual(40)
  })

  it('reports unclosed and stray tags without inventing markup', () => {
    const r = formatHtml('<div><span>hi</div></p>')
    expect(r.issues.map((i) => i.code)).toEqual(['html-unclosed', 'html-unmatched'])
    expect(squash(r.output)).toBe(squash('<div><span>hi</div></p>'))
  })
})

describe('Django / Jinja templates', () => {
  it('keeps tags intact, including inside attributes', () => {
    const src =
      '<a href="{% url \'home\' %}" {% if x > 1 %}class="a"{% endif %}>{{ user.name|default:"anon" }}</a>'
    const r = formatHtml(src, { template: 'on' })
    expect(r.issues).toEqual([])
    expect(r.output).toContain("{% url 'home' %}")
    expect(r.output).toContain('{{ user.name|default:"anon" }}')
    expect(squash(r.output)).toBe(squash(src))
  })

  it('auto mode switches on when the input has template syntax', () => {
    expect(formatHtml('<p>{{ a }}</p>').template).toBe(true)
    expect(formatHtml('<p>a</p>').template).toBe(false)
    expect(formatHtml('<p>{{ a </p>', { template: 'off' }).issues).toEqual([])
  })

  it('accepts balanced blocks, custom block tags and raw blocks', () => {
    const src = `{% extends "base.html" %}
{% load i18n %}
{% block content %}
{% for x in xs %}{% if x %}<i>{{ x }}</i>{% elif y %}no{% else %}-{% endif %}{% empty %}none{% endfor %}
{% mytag a %}body{% endmytag %}
{% comment %}{% if never closed{% endcomment %}
{% endblock content %}`
    expect(codes(src)).toEqual([])
  })

  it('suggests a closer for an unclosed block and the fix applies cleanly', () => {
    const src = '{% if a %}\n<p>x</p>\n{% for i in b %}\n{{ i }}\n{% endif %}\n'
    const r = formatHtml(src)
    const issue = r.issues.find((i) => i.code === 'tpl-unclosed-block')
    expect(issue?.message).toContain('{% for %}')
    const fixed = applyEdits(src, issue?.fixes ?? [])
    expect(fixed).toBe(
      '{% if a %}\n<p>x</p>\n{% for i in b %}\n{{ i }}\n{% endfor %}\n{% endif %}\n',
    )
    expect(codes(fixed)).toEqual([])
  })

  it('closes blocks missing at the end of the file, innermost first', () => {
    const src = '{% if a %}{% with b=1 %}x'
    const edits = formatHtml(src).issues.flatMap((i) => i.fixes ?? [])
    expect(applyEdits(src, edits)).toBe('{% if a %}{% with b=1 %}x\n{% endwith %}\n{% endif %}')
  })

  it('flags a stray end tag and a typo of one', () => {
    expect(codes('{% endif %}')).toEqual(['tpl-unexpected-end'])
    const src = '{% if a %}x{% endfi %}'
    const fix = formatHtml(src).issues.find((i) => i.code === 'tpl-unexpected-end')
    expect(applyEdits(src, fix?.fixes ?? [])).toBe('{% if a %}x{% endif %}')
  })

  it('fixes unclosed delimiters, else if, uppercase tags and endblock names', () => {
    const fixAll = (src: string) =>
      applyEdits(
        src,
        formatHtml(src).issues.flatMap((i) => i.fixes ?? []),
      )
    expect(fixAll('<p>{{ name }</p>')).toBe('<p>{{ name }}</p>')
    expect(fixAll('{% if a }x{% endif %}')).toBe('{% if a %}x{% endif %}')
    expect(fixAll('{% if a %}x{% else if b %}y{% endif %}')).toBe(
      '{% if a %}x{% elif b %}y{% endif %}',
    )
    expect(fixAll('{% IF a %}x{% endif %}')).toBe('{% if a %}x{% endif %}')
    expect(fixAll('{% block a %}{% endblock b %}')).toBe('{% block a %}{% endblock a %}')
  })

  it('reports problems that have no safe fix without suggesting an edit', () => {
    const r = formatHtml('{% for x %}{% endfor %}{% if %}{% endif %}{{ a| }}{% else %}')
    expect(r.issues.map((i) => i.code).sort()).toEqual(
      ['tpl-missing-arg', 'tpl-missing-arg', 'tpl-syntax', 'tpl-unexpected-middle'].sort(),
    )
    expect(r.issues.every((i) => !i.fixes)).toBe(true)
  })

  it('still formats broken templates and never changes their content', () => {
    const src = '<div>{% if a %}<p>x</p>{% for %}</div>'
    const r = formatHtml(src)
    expect(r.issues.length).toBeGreaterThan(0)
    expect(squash(r.output)).toBe(squash(src))
  })
})
