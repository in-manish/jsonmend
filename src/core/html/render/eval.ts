/** Evaluates parsed expressions against plain data. No `eval`, no access to prototypes. */
import type { Expr } from './expr'
import { FILTERS } from './filters'
import { getAttr, isPlainObject, str, truthy } from './value'

export class Scope {
  private vars = new Map<string, unknown>()
  private parent?: Scope
  constructor(parent?: Scope, root?: Record<string, unknown>) {
    this.parent = parent
    if (root) for (const [k, v] of Object.entries(root)) this.vars.set(k, v)
  }
  set(name: string, v: unknown) {
    this.vars.set(name, v)
  }
  get(name: string): unknown {
    return this.vars.has(name) ? this.vars.get(name) : this.parent?.get(name)
  }
  child() {
    return new Scope(this)
  }
}

const plain = (v: unknown) => (typeof v === 'object' && v !== null && 's' in v ? str(v) : v)

function compare(op: string, a: unknown, b: unknown): boolean {
  const x = plain(a)
  const y = plain(b)
  switch (op) {
    case '==':
      return (
        x === y || (typeof x !== 'object' && String(x) === String(y) && x !== null && y !== null)
      )
    case '!=':
      return !compare('==', a, b)
    case '<':
      return (x as number) < (y as number)
    case '>':
      return (x as number) > (y as number)
    case '<=':
      return (x as number) <= (y as number)
    default:
      return (x as number) >= (y as number)
  }
}

function binary(op: string, a: unknown, b: unknown): unknown {
  switch (op) {
    case '+':
      return typeof a === 'number' && typeof b === 'number'
        ? a + b
        : Array.isArray(a) && Array.isArray(b)
          ? [...a, ...b]
          : str(a) + str(b)
    case '~':
      return str(a) + str(b)
    case '-':
      return Number(a) - Number(b)
    case '*':
      return typeof a === 'string' ? a.repeat(Number(b)) : Number(a) * Number(b)
    case '/':
      return Number(a) / Number(b)
    case '//':
      return Math.floor(Number(a) / Number(b))
    case '%':
      return Number(a) % Number(b)
    case 'in': {
      const c = plain(b)
      return typeof c === 'string'
        ? c.includes(str(a))
        : Array.isArray(c)
          ? c.some((x) => compare('==', x, a))
          : isPlainObject(c) && Object.hasOwn(c, str(a))
    }
    default:
      return compare(op, a, b)
  }
}

const TESTS: Record<string, (v: unknown) => boolean> = {
  defined: (v) => v !== undefined,
  undefined: (v) => v === undefined,
  none: (v) => v === null,
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number',
  even: (v) => Number(v) % 2 === 0,
  odd: (v) => Number(v) % 2 === 1,
  true: (v) => v === true,
  false: (v) => v === false,
}

export interface EvalHooks {
  /** Called once per filter name that is not simulated. */
  unknownFilter(name: string): void
}

export function evaluate(e: Expr, scope: Scope, hooks: EvalHooks): unknown {
  const ev = (x: Expr) => evaluate(x, scope, hooks)
  switch (e.t) {
    case 'lit':
      return e.v
    case 'var':
      return scope.get(e.name)
    case 'get':
      return getAttr(ev(e.obj), ev(e.key))
    case 'list':
      return e.items.map(ev)
    case 'not':
      return !truthy(ev(e.e))
    case 'neg':
      return -Number(ev(e.e))
    case 'cond':
      return truthy(ev(e.test)) ? ev(e.a) : ev(e.b)
    case 'is': {
      const r = TESTS[e.test]?.(ev(e.e)) ?? false
      return e.neg ? !r : r
    }
    case 'bin':
      if (e.op === 'and') {
        const a = ev(e.a)
        return truthy(a) ? ev(e.b) : a
      }
      if (e.op === 'or') {
        const a = ev(e.a)
        return truthy(a) ? a : ev(e.b)
      }
      return binary(e.op, ev(e.a), ev(e.b))
    case 'filter': {
      const f = FILTERS[e.name]
      if (!f) {
        hooks.unknownFilter(e.name)
        return ev(e.e)
      }
      return f(ev(e.e), e.args.map(ev))
    }
    case 'call': {
      if (e.fn.t === 'var' && e.fn.name === 'range') {
        const [a, b] = e.args.map((x) => Number(ev(x)))
        const [from, to] = b === undefined ? [0, a] : [a, b]
        return Array.from({ length: Math.max(0, Math.min(to - from, 1000)) }, (_, i) => from + i)
      }
      if (e.fn.t === 'var' && e.fn.name === '_') return ev(e.args[0] ?? { t: 'lit', v: '' })
      // Method calls on data (items.all(), name.title()) read the attribute instead.
      return ev(e.fn)
    }
  }
}
