import { describe, expect, it } from 'vitest'
import { fillTemplate } from '../../src/core/html/render/index'

const fill = (src: string, data?: unknown) => fillTemplate(src, data)

describe('fillTemplate', () => {
  it('infers variables and fills them from their names', () => {
    const r = fill('<p>{{ user.name }} <{{ "x" }}>{{ user.email }} {{ order.total }}</p>')
    expect(r.generated).toEqual({
      user: { name: 'Jane Doe', email: 'jane.doe@example.com' },
      order: { total: 49.99 },
    })
    expect(r.html).toContain('Jane Doe')
    expect(r.html).toContain('jane.doe@example.com')
    expect(r.html).toContain('49.99')
  })

  it('infers a list from a for loop and renders three items with forloop/loop', () => {
    const r = fill(
      '<ul>{% for item in items %}<li>{{ forloop.counter }}. {{ item.title }}</li>{% endfor %}</ul>',
    )
    expect((r.generated.items as unknown[]).length).toBe(3)
    expect(r.html).toBe(
      '<ul><li>1. Sample title</li><li>2. Sample title 2</li><li>3. Sample title 3</li></ul>',
    )
    expect(fill('{% for t in tags %}{{ loop.index }}{{ t }},{% endfor %}').html).toContain(
      '1Sample tag',
    )
  })

  it('handles if / elif / else, comparisons and else-less branches', () => {
    expect(fill('{% if user.is_staff %}staff{% else %}guest{% endif %}').html).toBe('staff')
    expect(
      fill('{% if status == "paid" %}P{% elif status == "late" %}L{% else %}O{% endif %}').html,
    ).toBe('P')
    expect(fill('{% if x == "a" %}A{% endif %}', { x: 'b' }).html).toBe('')
    expect(fill('{% if not items %}none{% else %}some{% endif %}').html).toBe('some')
  })

  it('applies Django and Jinja filters', () => {
    const r = fill(
      '{{ name|upper }}|{{ items|length }}|{{ price|floatformat:1 }}|{{ missing|default:"n/a" }}|{{ created_at|date:"Y-m-d" }}|{{ tags|join:", " }}',
      { missing: '' },
    )
    expect(r.html).toBe('JANE DOE|3|50.0|n/a|2025-01-15|Sample tag, Sample tag 2, Sample tag 3')
    expect(fill('{{ x|d("fallback") }}{{ "a b"|title }}', { x: 0 }).html).toBe('fallbackA B')
  })

  it('escapes output unless the value is marked safe', () => {
    expect(fill('{{ h }}', { h: '<b>x</b>' }).html).toBe('&#60;b&#62;x&#60;/b&#62;')
    expect(fill('{{ h|safe }}', { h: '<b>x</b>' }).html).toBe('<b>x</b>')
  })

  it('lets the user override generated data, merging deeply', () => {
    const r = fill('{{ user.name }} {{ user.email }}', { user: { name: 'Ada' } })
    expect(r.html).toBe('Ada jane.doe@example.com')
    expect(r.data).toEqual({ user: { name: 'Ada', email: 'jane.doe@example.com' } })
  })

  it('renders simple tags, with, set, comments and ignores load/extends', () => {
    const r = fill(
      '{% extends "b.html" %}{% load static %}{# note #}{% with t=order.title %}{{ t }}{% endwith %}{% set n = 2 %}{{ n + 1 }}<a href="{% url \'x\' 1 %}">{% static \'a.css\' %}</a>{% comment %}{{ hidden }}{% endcomment %}',
    )
    expect(r.html).toBe('Sample title3<a href="#">/static/a.css</a>')
    expect(r.generated).toEqual({ order: { title: 'Sample title' } })
  })

  it('shows the empty branch for empty lists and keeps raw blocks verbatim', () => {
    expect(fill('{% for x in xs %}a{% empty %}none{% endfor %}', { xs: [] }).html).toBe('none')
    expect(fill('{% verbatim %}{{ keep }}{% endverbatim %}').html).toBe('{{ keep }}')
  })

  it('reports unsupported tags, filters and unreadable expressions instead of failing', () => {
    const r = fill('{% weird a %}{{ x|nope }}{{ a + }}{% macro m() %}{{ y }}{% endmacro %}ok')
    expect(r.html).toBe('Sample xok')
    const notes = r.notes.join('\n')
    expect(notes).toContain('{% weird %} is not simulated')
    expect(notes).toContain('"nope" filter is not simulated')
    expect(notes).toContain('Could not read {{ a + }}')
    expect(notes).toContain('macro')
  })

  it('never reaches prototypes or pollutes them', () => {
    const r = fill(
      '{{ a.constructor }}{{ a.toString }}{{ x }}',
      JSON.parse('{"a":{"b":1},"__proto__":{"polluted":"y"}}'),
    )
    expect(r.html).not.toMatch(/function|native code/)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('caps runaway output', () => {
    const r = fill(
      '{% for i in range(1000) %}{% for j in range(1000) %}xxxxxxxxxx{% endfor %}{% endfor %}',
    )
    expect(r.html.length).toBeLessThan(3 * 1024 * 1024)
  })
})
