import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { fixPythonIndentation, terminalCommand } from '../../src/core/pyindent/fix'

const fix = (s: string, o = {}) => fixPythonIndentation(s, o)

describe('python indentation fixer', () => {
  it('replaces tabs with spaces and reports each line', () => {
    const r = fix('def f(x):\n\tif x:\n\t\treturn 1\n\treturn 2\n')
    expect(r.output).toBe('def f(x):\n    if x:\n        return 1\n    return 2\n')
    expect(r.issues.map((i) => [i.line, i.code])).toEqual([
      [2, 'tab'],
      [3, 'tab'],
      [4, 'tab'],
    ])
    expect(r.issues[0]).toMatchObject({ from: 10, to: 11 })
  })

  it('re-indents 2-space and 8-space code to 4 spaces', () => {
    expect(fix('if a:\n  if b:\n    x = 1\n  y = 2\n').output).toBe(
      'if a:\n    if b:\n        x = 1\n    y = 2\n',
    )
    expect(fix('if a:\n        x = 1\n').output).toBe('if a:\n    x = 1\n')
    expect(fix('if a:\n  x = 1\n', { indentSize: 2 }).issues).toEqual([])
  })

  it('rebuilds mixed tab and space indentation', () => {
    const r = fix('if a:\n\t  x = 1\n')
    expect(r.output).toBe('if a:\n    x = 1\n')
    expect(r.issues[0].code).toBe('mixed')
  })

  it('shifts an indented snippet (a pasted method) to column 0', () => {
    const r = fix('    def m(self):\n        return 1\n')
    expect(r.output).toBe('def m(self):\n    return 1\n')
    expect(r.issues[0].code).toBe('snippet-indent')
  })

  it('never touches docstrings or multi-line strings', () => {
    const src = 'def f():\n\t"""Doc\n\t   indented\tline\n\t"""\n\treturn 1\n'
    expect(fix(src).output).toBe('def f():\n    """Doc\n\t   indented\tline\n\t"""\n    return 1\n')
  })

  it('keeps hanging alignment inside brackets and backslash continuations', () => {
    const src = 'def f():\n\tx = call(a,\n\t\t\tb)\n\ty = 1 + \\\n\t\t2\n'
    expect(fix(src).output).toBe(
      'def f():\n    x = call(a,\n            b)\n    y = 1 + \\\n        2\n',
    )
  })

  it('aligns comments with the code they precede', () => {
    const src = 'if a:\n  # note\n  x = 1\n# top\ny = 2\n'
    expect(fix(src).output).toBe('if a:\n    # note\n    x = 1\n# top\ny = 2\n')
  })

  it('flags problems it cannot fix safely', () => {
    const missing = fix('if a:\nx = 1\n')
    expect(missing.issues.map((i) => [i.code, i.fixed, i.severity])).toEqual([
      ['missing-block', false, 'error'],
    ])
    expect(missing.output).toBe('if a:\nx = 1\n')

    const unexpected = fix('x = 1\n    y = 2\n')
    expect(unexpected.output).toBe('x = 1\ny = 2\n')
    expect(unexpected.issues[0]).toMatchObject({ code: 'unexpected-indent', severity: 'guess' })

    const dedent = fix('if a:\n    if b:\n        x = 1\n      y = 2\n')
    expect(dedent.issues.map((i) => i.code)).toContain('inconsistent-dedent')
    expect(dedent.output).toBe('if a:\n    if b:\n        x = 1\n    y = 2\n')
  })

  it('normalizes CRLF, trailing whitespace and the final newline', () => {
    const r = fix('a = 1   \r\n\r\nb = 2')
    expect(r.output).toBe('a = 1\n\nb = 2\n')
    expect(r.issues[0].code).toBe('crlf')
  })

  it('leaves correct code untouched and is idempotent', () => {
    const good = 'class A:\n    def f(self):\n        return [\n            1,\n        ]\n'
    const r = fix(good)
    expect(r.output).toBe(good)
    expect(r.issues).toEqual([])
    expect(r.changedLines).toBe(0)
  })

  it('builds a heredoc command with a safe delimiter', () => {
    expect(terminalCommand('print(1)\n')).toBe(`python3 -c "$(cat <<'PY'\nprint(1)\nPY\n)"\n`)
    expect(terminalCommand('PY\n')).toContain("<<'PY_'")
  })
})

describe('python indentation fixer (generated programs)', () => {
  // Levels never jump by more than one; a line opens a block when the next line is deeper.
  const program = fc
    .array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 12 })
    .map((raw) => {
      const levels = [0]
      for (const d of raw.slice(1)) {
        const prev = levels[levels.length - 1]
        levels.push(Math.min(d, prev + 1))
      }
      return levels
    })

  const render = (levels: number[], unit: string) =>
    levels
      .map((lv, i) => {
        const opens = levels[i + 1] > lv
        const body = opens ? `if v${i}:` : `v${i} = ${i}`
        return unit.repeat(lv) + body
      })
      .join('\n')

  it('normalizes any consistent indent style to 4 spaces', () => {
    fc.assert(
      fc.property(
        program,
        fc.constantFrom('\t', '  ', '   ', '    ', '        '),
        (levels, unit) => {
          const r = fix(`${render(levels, unit)}\n`)
          expect(r.output).toBe(`${render(levels, '    ')}\n`)
          expect(fix(r.output).output).toBe(r.output)
        },
      ),
    )
  })
})
