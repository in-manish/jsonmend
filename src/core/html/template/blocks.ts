import { checkTag } from './normalize'
import type { Reporter } from './reporter'
import type { TplToken } from './scan'
import { MIDDLE, PAIRS, RAW } from './tables'
import { distance, type Parsed, parseTag } from './tag'

interface Open {
  p: Parsed
  closer: string
}

const endText = (name: string) => `{% ${name} %}`

/**
 * Matches every opening tag with its end tag. Problems come with an edit that only inserts the
 * missing end tag (or repairs a typo), never one that deletes content.
 */
export function checkBlocks(tokens: TplToken[], rep: Reporter) {
  const { src } = rep
  const tags = tokens.filter((t) => t.closed && t.kind === 'tag')

  // Custom block tags: any `endfoo` in the document makes `foo` a block we should expect to close.
  const ends = new Set<string>()
  for (const t of tags) {
    const p = parseTag(src, t)
    if (p?.name.startsWith('end') && p.name.length > 3) ends.add(p.name.slice(3))
  }
  const closerOf = (p: Parsed): string | undefined => {
    if (PAIRS[p.name]) return PAIRS[p.name]
    if (p.name === 'set' && !p.rest.includes('=')) return 'endset'
    if (ends.has(p.name)) return `end${p.name}`
    return undefined
  }

  const stack: Open[] = []
  let raw: string | undefined

  /** Reports every block above `keep` as unclosed, with fixes inserting their closers before `before`. */
  const unwind = (keep: number, before: TplToken, because: string) => {
    for (let k = stack.length - 1; k > keep; k--) {
      const o = stack[k]
      rep.add(o.p.tok.from, o.p.tok.to, {
        code: 'tpl-unclosed-block',
        message: `{% ${o.p.name} %} opened on line ${rep.lineAt(o.p.tok.from)} is not closed before ${because}`,
        suggestion: `Add ${endText(o.closer)} before it.`,
        fixes: [rep.insertBefore(before.from, endText(o.closer), stack.length - k)],
      })
    }
    stack.length = keep + 1
  }

  for (const tok of tags) {
    const p = parseTag(src, tok)
    if (!p) {
      rep.add(tok.from, tok.to, {
        code: 'tpl-syntax',
        message: 'Empty or invalid "{% %}" tag',
        suggestion: 'Write a tag name after "{%", or delete it.',
      })
      continue
    }
    if (raw) {
      if (p.name !== raw) continue
      raw = undefined
    }
    checkTag(p, rep)

    const closer = closerOf(p)
    if (closer) {
      stack.push({ p, closer })
      if (RAW.has(p.name)) raw = closer
    } else if (MIDDLE[p.name]) {
      const parents = MIDDLE[p.name]
      const j = stack.findLastIndex((o) => parents.includes(o.p.name))
      if (j < 0) {
        rep.add(tok.from, tok.to, {
          code: 'tpl-unexpected-middle',
          message: `{% ${p.name} %} is outside of ${parents.map((n) => `{% ${n} %}`).join(' / ')}`,
          suggestion: 'Open the block before it, or remove this tag.',
        })
      } else unwind(j, tok, `{% ${p.name} %}`)
    } else if (p.name.startsWith('end') && p.name.length > 3) {
      closeBlock(p)
    }
  }

  function closeBlock(p: Parsed) {
    const { tok } = p
    const want = stack.findLastIndex((o) => o.closer === p.name)
    if (want === -1) {
      const top = stack[stack.length - 1]
      const near = top && distance(p.name, top.closer) <= 2
      rep.add(tok.from, tok.to, {
        code: 'tpl-unexpected-end',
        message: `{% ${p.name} %} has no matching {% ${p.name.slice(3)} %}`,
        suggestion: near
          ? `Did you mean ${endText(top.closer)}?`
          : 'Remove it, or add the opening tag before it.',
        fixes: near ? [{ from: p.nameFrom, to: p.nameTo, insert: top.closer }] : undefined,
      })
      if (near) stack.pop()
      return
    }
    unwind(want, tok, `{% ${p.name} %}`)
    const open = stack.pop()
    if (open?.p.name !== 'block') return
    const label = /^\S+/.exec(p.rest)?.[0]
    const expected = /^\S+/.exec(open.p.rest)?.[0]
    if (label && expected && label !== expected) {
      const at = tok.from + src.slice(tok.from, tok.to).lastIndexOf(label)
      rep.add(at, at + label.length, {
        code: 'tpl-end-name',
        severity: 'warn',
        message: `{% endblock ${label} %} closes the block named "${expected}"`,
        suggestion: `Use "${expected}".`,
        fixes: [{ from: at, to: at + label.length, insert: expected }],
      })
    }
  }

  // Blocks still open at the end: closers go at the end of the file, innermost first.
  let lead = src.endsWith('\n') ? '' : '\n'
  for (let k = stack.length - 1; k >= 0; k--) {
    const o = stack[k]
    rep.add(o.p.tok.from, o.p.tok.to, {
      code: 'tpl-unclosed-block',
      message: `{% ${o.p.name} %} is never closed`,
      suggestion: `Add ${endText(o.closer)} where the block should end (suggested: end of file).`,
      fixes: [
        {
          from: src.length,
          to: src.length,
          insert: `${lead}${endText(o.closer)}`,
          order: stack.length - k,
        },
      ],
    })
    lead = '\n'
  }
}
