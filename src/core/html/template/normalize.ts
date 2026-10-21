import type { Reporter } from './reporter'
import { MIDDLE, NEEDS_ARGS, PAIRS, TYPOS } from './tables'
import { expressionProblem, type Parsed } from './tag'

/**
 * Reports one tag's spelling and argument problems (case, typos, `else if`, `end if`, missing
 * arguments). Spelling slips are reported with a fix and then corrected in `p` itself, so the block
 * check that follows sees the tag the author meant.
 */
export function checkTag(p: Parsed, rep: Reporter) {
  const { src } = rep
  const { tok } = p
  const lower = p.name.toLowerCase()
  if (lower !== p.name && (PAIRS[lower] || PAIRS[lower.replace(/^end/, '')] || MIDDLE[lower])) {
    rep.add(p.nameFrom, p.nameTo, {
      code: 'tpl-case',
      message: `Tag names are lowercase: "${p.name}"`,
      suggestion: `Use "${lower}".`,
      fixes: [{ from: p.nameFrom, to: p.nameTo, insert: lower }],
    })
    p.name = lower
  }
  if (TYPOS[p.name]) {
    rep.add(p.nameFrom, p.nameTo, {
      code: 'tpl-typo',
      message: `"${p.name}" is not a template tag`,
      suggestion: `Use "${TYPOS[p.name]}".`,
      fixes: [{ from: p.nameFrom, to: p.nameTo, insert: TYPOS[p.name] }],
    })
    p.name = TYPOS[p.name]
  }
  if (p.name === 'else' && /^if\b/.test(p.rest)) {
    const ifEnd = tok.from + src.slice(tok.from, tok.to).indexOf('if', p.nameTo - tok.from) + 2
    rep.add(tok.from, tok.to, {
      code: 'tpl-typo',
      message: '"else if" is not valid',
      suggestion: 'Use "elif" with the condition.',
      fixes: [{ from: p.nameFrom, to: ifEnd, insert: 'elif' }],
    })
    p.name = 'elif'
    p.rest = p.rest.replace(/^if\s*/, '')
  }
  if (p.name === 'end' && /^[A-Za-z]/.test(p.rest)) {
    const word = /^[A-Za-z_]\w*/.exec(p.rest)?.[0] ?? ''
    rep.add(tok.from, tok.to, {
      code: 'tpl-typo',
      message: `"end ${word}" has a space in it`,
      suggestion: `Use "end${word}".`,
      fixes: [
        { from: p.nameTo, to: p.nameTo + (src.slice(p.nameTo).search(/\S/) || 0), insert: '' },
      ],
    })
    p.name = `end${word}`
    p.rest = p.rest.slice(word.length).trim()
  }

  const problem = expressionProblem(p.rest)
  if (problem)
    rep.add(tok.from, tok.to, { code: 'tpl-syntax', message: `{% ${p.name} %}: ${problem}` })
  if (NEEDS_ARGS.has(p.name) && p.rest === '') {
    rep.add(tok.from, tok.to, {
      code: 'tpl-missing-arg',
      message: `{% ${p.name} %} needs ${p.name === 'if' || p.name === 'elif' ? 'a condition' : 'an argument'}`,
    })
  } else if (p.name === 'for' && !/\sin\s/.test(` ${p.rest} `)) {
    rep.add(tok.from, tok.to, {
      code: 'tpl-missing-arg',
      message: '{% for %} needs "in": {% for item in items %}',
    })
  }
}
