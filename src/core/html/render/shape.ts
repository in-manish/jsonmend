/** Works out what data a template expects: which variables, which attributes, which are lists. */
import type { Expr } from './expr'
import { parseExprs } from './expr'
import type { TNode } from './parse'

export class Shape {
  kind: 'leaf' | 'obj' | 'list' = 'leaf'
  props = new Map<string, Shape>()
  elem?: Shape
  /** Loop over `key, value` pairs. */
  pair = false
  /** A value the template compares against (`x == "paid"`): used as the sample. */
  literal?: unknown
  /** Kind of value implied by a filter (`date`, `number`) when the name says nothing. */
  hint = ''

  prop(name: string): Shape {
    if (this.kind === 'list') return this.asElem().prop(name)
    this.kind = 'obj'
    let s = this.props.get(name)
    if (!s) {
      s = new Shape()
      this.props.set(name, s)
    }
    return s
  }

  asList(): Shape {
    if (this.kind !== 'list') {
      const elem = new Shape()
      if (this.kind === 'obj') {
        elem.kind = 'obj'
        elem.props = this.props
        this.props = new Map()
      }
      this.kind = 'list'
      this.elem = elem
    }
    return this
  }

  asElem(): Shape {
    return this.asList().elem as Shape
  }
}

/** Names the renderer provides itself. */
const BUILTIN = new Set(['forloop', 'loop', 'csrf_token', 'self', 'super', 'range', '_'])
/** Filters whose output is still the same list. */
const PASS = new Set([
  'default',
  'd',
  'slice',
  'sort',
  'reverse',
  'dictsort',
  'safe',
  'escape',
  'e',
  'list',
])
const LIST_FILTERS = new Set([
  'length',
  'count',
  'first',
  'last',
  'join',
  'sort',
  'reverse',
  'list',
  'slice',
  'pluralize',
])
const NUMBER_FILTERS = new Set([
  'floatformat',
  'intcomma',
  'add',
  'round',
  'int',
  'float',
  'filesizeformat',
])
const DATE_FILTERS = new Set(['date', 'time', 'timesince', 'timeuntil'])
const LIST_ATTRS = new Set(['all', 'values'])

/** Tags whose arguments are names or formats, not variables. */
const NO_ARGS = new Set(['load', 'extends', 'import', 'from', 'now', 'csrf_token', 'debug'])

type Scope = Map<string, Shape>

class Inferer {
  readonly root = new Shape()

  visit(e: Expr, scope: Scope): Shape | undefined {
    switch (e.t) {
      case 'var':
        if (BUILTIN.has(e.name)) return undefined
        return scope.get(e.name) ?? this.root.prop(e.name)
      case 'get': {
        const base = this.visit(e.obj, scope)
        this.visit(e.key, scope)
        if (!base) return undefined
        if (e.key.t === 'lit') {
          const key = String(e.key.v)
          if (/^\d+$/.test(key)) return base.asElem()
          return LIST_ATTRS.has(key) ? base.asList() : base.prop(key)
        }
        return base.asElem()
      }
      case 'call':
        e.args.forEach((a) => {
          this.visit(a, scope)
        })
        return this.visit(e.fn, scope)
      case 'filter': {
        const base = this.visit(e.e, scope)
        e.args.forEach((a) => {
          this.visit(a, scope)
        })
        if (!base) return undefined
        if (LIST_FILTERS.has(e.name)) base.asList()
        if (NUMBER_FILTERS.has(e.name) && !base.hint) base.hint = 'number'
        if (DATE_FILTERS.has(e.name) && !base.hint) base.hint = 'date'
        return PASS.has(e.name) ? base : undefined
      }
      case 'bin': {
        const a = this.visit(e.a, scope)
        const b = this.visit(e.b, scope)
        if (e.op === '==' || e.op === '!=') {
          if (a && e.b.t === 'lit' && e.op === '==' && a.literal === undefined) a.literal = e.b.v
          if (b && e.a.t === 'lit' && e.op === '==' && b.literal === undefined) b.literal = e.a.v
        }
        if (e.op === 'in') b?.asList()
        return undefined
      }
      case 'not':
      case 'neg':
      case 'is':
        this.visit(e.e, scope)
        return undefined
      case 'cond':
        this.visit(e.test, scope)
        this.visit(e.a, scope)
        this.visit(e.b, scope)
        return undefined
      case 'list':
        e.items.forEach((i) => {
          this.visit(i, scope)
        })
        return undefined
      default:
        return undefined
    }
  }

  walk(nodes: TNode[], scope: Scope) {
    for (const n of nodes) {
      switch (n.t) {
        case 'var':
          this.visit(n.e, scope)
          break
        case 'if':
          for (const b of n.branches) {
            if (b.cond) this.visit(b.cond, scope)
            this.walk(b.body, scope)
          }
          break
        case 'for': {
          const list = this.visit(n.iter, scope)?.asList()
          const inner = new Map(scope)
          if (n.targets.length === 1) inner.set(n.targets[0], list?.elem ?? new Shape())
          else {
            if (list) list.pair = true
            for (const t of n.targets) inner.set(t, new Shape())
          }
          this.walk(n.body, inner)
          this.walk(n.empty, scope)
          break
        }
        case 'with': {
          const inner = new Map(scope)
          for (const b of n.binds) inner.set(b.name, this.visit(b.e, scope) ?? new Shape())
          this.walk(n.body, inner)
          break
        }
        case 'set':
          scope.set(n.name, this.visit(n.e, scope) ?? new Shape())
          break
        case 'group':
          this.walk(n.body, scope)
          break
        case 'tag':
          if (NO_ARGS.has(n.name)) break
          try {
            for (const e of parseExprs(n.rest)) this.visit(e, scope)
          } catch {
            // Tag arguments the expression parser does not understand add no variables.
          }
          break
        default:
      }
    }
  }
}

export function inferShape(nodes: TNode[]): Shape {
  const inf = new Inferer()
  inf.walk(nodes, new Map())
  return inf.root
}
