/** Renders a parsed template with data. Output is HTML text; nothing is executed. */

import { formatDate, toDate } from './dateFormat'
import { evaluate, type Scope } from './eval'
import { parseExprs } from './expr'
import type { TNode } from './parse'
import { escapeHtml, isPlainObject, Safe, str, truthy } from './value'

const MAX_OUTPUT = 2 * 1024 * 1024
const MAX_ITEMS = 500

export interface RenderCtx {
  notes: Set<string>
  size: number
}

export function renderNodes(nodes: TNode[], scope: Scope, out: string[], ctx: RenderCtx) {
  const hooks = {
    unknownFilter: (name: string) =>
      ctx.notes.add(`The "${name}" filter is not simulated; the value is shown as is`),
  }
  const emit = (s: string) => {
    if (ctx.size < MAX_OUTPUT) {
      out.push(s)
      ctx.size += s.length
    }
  }
  const args = (rest: string): unknown[] => {
    try {
      return parseExprs(rest).map((e) => evaluate(e, scope, hooks))
    } catch {
      return []
    }
  }

  for (const n of nodes) {
    switch (n.t) {
      case 'text':
        emit(n.s)
        break
      case 'var': {
        const v = evaluate(n.e, scope, hooks)
        if (v === undefined) ctx.notes.add(`No data for {{ ${n.src} }}: it prints nothing`)
        emit(v instanceof Safe ? v.s : escapeHtml(str(v)))
        break
      }
      case 'if': {
        const hit = n.branches.find((b) => !b.cond || truthy(evaluate(b.cond, scope, hooks)))
        if (hit) renderNodes(hit.body, scope, out, ctx)
        break
      }
      case 'for': {
        const v = evaluate(n.iter, scope, hooks)
        const items = Array.isArray(v) ? v : isPlainObject(v) ? Object.keys(v) : []
        if (items.length === 0) {
          renderNodes(n.empty, scope, out, ctx)
          break
        }
        const shown = items.slice(0, MAX_ITEMS)
        shown.forEach((item, i) => {
          const inner = scope.child()
          const loop = {
            counter: i + 1,
            counter0: i,
            index: i + 1,
            index0: i,
            revcounter: shown.length - i,
            revcounter0: shown.length - i - 1,
            first: i === 0,
            last: i === shown.length - 1,
            length: shown.length,
          }
          inner.set('forloop', loop)
          inner.set('loop', loop)
          if (n.targets.length === 1) inner.set(n.targets[0], item)
          else {
            n.targets.forEach((t, k) => {
              inner.set(t, Array.isArray(item) ? item[k] : undefined)
            })
          }
          renderNodes(n.body, inner, out, ctx)
        })
        break
      }
      case 'with': {
        const inner = scope.child()
        for (const b of n.binds) inner.set(b.name, evaluate(b.e, scope, hooks))
        renderNodes(n.body, inner, out, ctx)
        break
      }
      case 'set':
        scope.set(n.name, evaluate(n.e, scope, hooks))
        break
      case 'group':
        renderNodes(n.body, scope, out, ctx)
        break
      case 'tag':
        emit(renderTag(n.name, n.rest, args(n.rest), ctx))
        break
    }
  }
}

/** Simple tags: what they would print, or a stand-in. */
function renderTag(name: string, rest: string, a: unknown[], ctx: RenderCtx): string {
  switch (name) {
    case 'url':
      return '#'
    case 'static':
      return `/static/${str(a[0])}`
    case 'csrf_token':
      return '<input type="hidden" name="csrfmiddlewaretoken" value="sample-csrf-token">'
    case 'trans':
    case 'translate':
      return escapeHtml(str(a[0]))
    case 'now': {
      return formatDate(toDate(new Date()) as Date, str(a[0]) || 'Y-m-d')
    }
    case 'firstof':
      return escapeHtml(str(a.find(truthy)))
    case 'lorem':
      return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    case 'include':
      ctx.notes.add(`{% include ${rest.split(/\s/)[0]} %} is not loaded: shown as a placeholder`)
      return `<div style="border:1px dashed #94a3b8;padding:4px 8px;color:#64748b;font:12px Arial">include ${escapeHtml(str(a[0]))}</div>`
    case 'extends':
    case 'load':
    case 'import':
    case 'from':
    case 'debug':
      return ''
    default:
      ctx.notes.add(`{% ${name} %} is not simulated and prints nothing`)
      return ''
  }
}
