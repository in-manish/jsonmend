/** Turns template source into a tree of text, variables, if / for / with and simple tags. */
import { scanTemplate } from '../template/index'
import { type Expr, parseExpr } from './expr'

export type TNode =
  | { t: 'text'; s: string }
  | { t: 'var'; e: Expr; src: string }
  | { t: 'if'; branches: { cond?: Expr; body: TNode[] }[] }
  | { t: 'for'; targets: string[]; iter: Expr; body: TNode[]; empty: TNode[] }
  | { t: 'with'; binds: { name: string; e: Expr }[]; body: TNode[] }
  | { t: 'set'; name: string; e: Expr }
  | { t: 'tag'; name: string; rest: string }
  /** Body is rendered as is (block, spaceless, blocktrans…). */
  | { t: 'group'; body: TNode[] }

export interface Parsed {
  nodes: TNode[]
  notes: string[]
}

const GROUPS = new Set([
  'block',
  'spaceless',
  'autoescape',
  'localize',
  'language',
  'cache',
  'ifchanged',
  'blocktrans',
  'blocktranslate',
  'filter',
  'trans',
])
/** Bodies that are not rendered. */
const SKIPPED = new Set(['macro', 'call', 'set'])
const UNDEFINED: Expr = { t: 'lit', v: undefined }

interface Frame {
  name: string
  body: TNode[]
  /** Switches the current body for else / elif / empty. */
  node?: TNode
}

export function parseTemplate(src: string): Parsed {
  const notes = new Set<string>()
  const tryParse = (code: string, where: string): Expr => {
    try {
      return parseExpr(code)
    } catch (err) {
      notes.add(`Could not read ${where}: ${err instanceof Error ? err.message : 'syntax error'}`)
      return UNDEFINED
    }
  }

  const root: Frame = { name: '#root', body: [] }
  const stack: Frame[] = [root]
  const top = () => stack[stack.length - 1]
  const push = (n: TNode) => top().body.push(n)
  const open = (name: string, node?: TNode) => {
    push(node ?? { t: 'group', body: [] })
    const n = top().body[top().body.length - 1]
    stack.push({ name, node: n, body: n.t === 'group' || n.t === 'with' ? n.body : [] })
    return n
  }
  const skipping = () => stack.some((f) => f.name === '#skip')

  let pos = 0
  for (const tok of scanTemplate(src)) {
    if (!tok.closed || tok.from < pos) continue
    if (tok.from > pos && !skipping()) push({ t: 'text', s: src.slice(pos, tok.from) })
    pos = tok.to
    if (tok.kind === 'comment') continue
    const inner = src
      .slice(tok.from + 2, tok.to - 2)
      .replace(/^[-+]|[-+]$/g, '')
      .trim()
    if (skipping() && tok.kind === 'var') continue
    if (tok.kind === 'var') {
      push({ t: 'var', e: tryParse(inner, `{{ ${inner} }}`), src: inner })
      continue
    }

    const m = /^([A-Za-z_]\w*)\s*([\s\S]*)$/.exec(inner)
    if (!m) continue
    const [, name, rest] = m
    if (name === 'raw' || name === 'verbatim' || name === 'comment') {
      const end = new RegExp(`\\{%[-+]?\\s*end${name}\\b[^%]*%\\}`).exec(src.slice(tok.to))
      const bodyEnd = end ? tok.to + end.index : src.length
      if (name !== 'comment' && !skipping()) push({ t: 'text', s: src.slice(tok.to, bodyEnd) })
      pos = end ? bodyEnd + end[0].length : src.length
      continue
    }
    if (skipping()) {
      if (name === 'endmacro' || name === 'endcall' || name === 'endset') stack.pop()
      continue
    }

    if (name === 'if') {
      open('if', { t: 'if', branches: [{ cond: tryParse(rest, '{% if %}'), body: [] }] })
      const f = top()
      if (f.node?.t === 'if') f.body = f.node.branches[0].body
    } else if (name === 'elif' || name === 'elseif') {
      const f = top()
      if (f.node?.t === 'if') {
        const body: TNode[] = []
        f.node.branches.push({ cond: tryParse(rest, '{% elif %}'), body })
        f.body = body
      }
    } else if (name === 'else' || name === 'empty') {
      const f = top()
      if (f.node?.t === 'if') {
        const body: TNode[] = []
        f.node.branches.push({ body })
        f.body = body
      } else if (f.node?.t === 'for') f.body = f.node.empty
    } else if (name === 'for') {
      const fm = /^(.+?)\s+in\s+([\s\S]+)$/.exec(rest)
      const targets = (fm?.[1] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const iter = fm
        ? tryParse(fm[2].replace(/\s+(reversed|recursive)$/, ''), '{% for %}')
        : UNDEFINED
      const node: TNode = { t: 'for', targets, iter, body: [], empty: [] }
      push(node)
      stack.push({ name: 'for', node, body: node.body })
    } else if (name === 'with') {
      const binds: { name: string; e: Expr }[] = []
      const asM = /^([\s\S]+?)\s+as\s+(\w+)$/.exec(rest)
      if (asM) binds.push({ name: asM[2], e: tryParse(asM[1], '{% with %}') })
      else {
        const parts = rest.split(/(?:^|\s)(\w+)=/).slice(1)
        for (let i = 0; i + 1 < parts.length; i += 2) {
          binds.push({ name: parts[i], e: tryParse(parts[i + 1].trim(), '{% with %}') })
        }
      }
      const node: TNode = { t: 'with', binds, body: [] }
      push(node)
      stack.push({ name: 'with', node, body: node.body })
    } else if (name === 'set') {
      const sm = /^(\w+)\s*=\s*([\s\S]+)$/.exec(rest)
      if (sm) push({ t: 'set', name: sm[1], e: tryParse(sm[2], '{% set %}') })
      else stack.push({ name: '#skip', body: [] })
    } else if (name === 'macro' || name === 'call') {
      notes.add(`{% ${name} %} blocks are not rendered in the preview`)
      stack.push({ name: '#skip', body: [] })
    } else if (GROUPS.has(name) && name !== 'trans') {
      open(name)
    } else if (name.startsWith('end') && name.length > 3) {
      const target = name.slice(3)
      let k = stack.length - 1
      while (k > 0 && stack[k].name !== target) k--
      if (k > 0) stack.length = k
    } else if (!SKIPPED.has(name)) {
      push({ t: 'tag', name, rest })
    }
  }
  if (pos < src.length && !skipping()) push({ t: 'text', s: src.slice(pos) })
  return { nodes: root.body, notes: [...notes] }
}
