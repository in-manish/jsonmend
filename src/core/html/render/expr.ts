/** Parser for Django / Jinja expressions: variables, literals, filters, comparisons, `a if b else c`. */
import { ExprError, lex, type Tok } from './lexer'

export type Expr =
  | { t: 'lit'; v: unknown }
  | { t: 'var'; name: string }
  | { t: 'get'; obj: Expr; key: Expr }
  | { t: 'call'; fn: Expr; args: Expr[] }
  | { t: 'filter'; e: Expr; name: string; args: Expr[] }
  | { t: 'bin'; op: string; a: Expr; b: Expr }
  | { t: 'not'; e: Expr }
  | { t: 'neg'; e: Expr }
  | { t: 'is'; e: Expr; test: string; neg: boolean }
  | { t: 'cond'; test: Expr; a: Expr; b: Expr }
  | { t: 'list'; items: Expr[] }

const LITERALS: Record<string, unknown> = {
  true: true,
  True: true,
  false: false,
  False: false,
  none: null,
  None: null,
  null: null,
}
const CMP = new Set(['==', '!=', '<', '>', '<=', '>='])

class Parser {
  private p = 0
  private toks: Tok[]
  constructor(toks: Tok[]) {
    this.toks = toks
  }

  done() {
    return this.p >= this.toks.length
  }
  private peek(): Tok | undefined {
    return this.toks[this.p]
  }
  private isOp(v: string) {
    const t = this.peek()
    return t?.k === 'op' && t.v === v
  }
  private isName(v: string) {
    const t = this.peek()
    return t?.k === 'name' && t.v === v
  }
  private eatOp(v: string) {
    if (!this.isOp(v)) throw new ExprError(`expected "${v}"`)
    this.p++
  }

  ternary(): Expr {
    const a = this.or()
    if (!this.isName('if')) return a
    this.p++
    const test = this.or()
    let b: Expr = { t: 'lit', v: undefined }
    if (this.isName('else')) {
      this.p++
      b = this.ternary()
    }
    return { t: 'cond', test, a, b }
  }

  private or(): Expr {
    let a = this.and()
    while (this.isName('or')) {
      this.p++
      a = { t: 'bin', op: 'or', a, b: this.and() }
    }
    return a
  }

  private and(): Expr {
    let a = this.not()
    while (this.isName('and')) {
      this.p++
      a = { t: 'bin', op: 'and', a, b: this.not() }
    }
    return a
  }

  private not(): Expr {
    if (this.isName('not')) {
      this.p++
      return { t: 'not', e: this.not() }
    }
    return this.cmp()
  }

  private cmp(): Expr {
    let a = this.add()
    for (;;) {
      const t = this.peek()
      if (t?.k === 'op' && CMP.has(t.v)) {
        this.p++
        a = { t: 'bin', op: t.v, a, b: this.add() }
      } else if (this.isName('in')) {
        this.p++
        a = { t: 'bin', op: 'in', a, b: this.add() }
      } else if (this.isName('not') && this.toks[this.p + 1]?.v === 'in') {
        this.p += 2
        a = { t: 'not', e: { t: 'bin', op: 'in', a, b: this.add() } }
      } else if (this.isName('is')) {
        this.p++
        const neg = this.isName('not')
        if (neg) this.p++
        const name = this.peek()
        if (name?.k !== 'name') throw new ExprError('expected a test name after "is"')
        this.p++
        a = { t: 'is', e: a, test: name.v, neg }
      } else return a
    }
  }

  private add(): Expr {
    let a = this.mul()
    for (;;) {
      const t = this.peek()
      if (t?.k === 'op' && (t.v === '+' || t.v === '-' || t.v === '~')) {
        this.p++
        a = { t: 'bin', op: t.v, a, b: this.mul() }
      } else return a
    }
  }

  private mul(): Expr {
    let a = this.unary()
    for (;;) {
      const t = this.peek()
      if (t?.k === 'op' && ['*', '/', '%', '//'].includes(t.v)) {
        this.p++
        a = { t: 'bin', op: t.v, a, b: this.unary() }
      } else return a
    }
  }

  private unary(): Expr {
    if (this.isOp('-')) {
      this.p++
      return { t: 'neg', e: this.unary() }
    }
    return this.postfix(true)
  }

  /** A value with `.attr`, `[key]`, `(args)` and, unless `filters` is false, `|filter` chains. */
  postfix(filters: boolean): Expr {
    let e = this.primary()
    for (;;) {
      if (this.isOp('.')) {
        this.p++
        const t = this.peek()
        if (t?.k !== 'name' && t?.k !== 'num') throw new ExprError('expected a name after "."')
        this.p++
        e = { t: 'get', obj: e, key: { t: 'lit', v: String(t.v) } }
      } else if (this.isOp('[')) {
        this.p++
        const key = this.ternary()
        this.eatOp(']')
        e = { t: 'get', obj: e, key }
      } else if (this.isOp('(')) {
        e = { t: 'call', fn: e, args: this.args() }
      } else if (filters && this.isOp('|')) {
        this.p++
        const name = this.peek()
        if (name?.k !== 'name') throw new ExprError('a filter name is missing after "|"')
        this.p++
        let args: Expr[] = []
        if (this.isOp(':')) {
          this.p++
          args = [this.postfix(false)]
        } else if (this.isOp('(')) args = this.args()
        e = { t: 'filter', e, name: name.v, args }
      } else return e
    }
  }

  private args(): Expr[] {
    this.eatOp('(')
    const out: Expr[] = []
    while (!this.isOp(')')) {
      if (this.done()) throw new ExprError('expected ")"')
      // Keyword arguments (name=value): keep the value, drop the name.
      if (this.peek()?.k === 'name' && this.toks[this.p + 1]?.v === '=') this.p += 2
      out.push(this.ternary())
      if (this.isOp(',')) this.p++
    }
    this.p++
    return out
  }

  private primary(): Expr {
    const t = this.peek()
    if (!t) throw new ExprError('the expression ends too early')
    this.p++
    if (t.k === 'str' || t.k === 'num') return { t: 'lit', v: t.v }
    if (t.k === 'name') {
      return t.v in LITERALS ? { t: 'lit', v: LITERALS[t.v] } : { t: 'var', name: t.v }
    }
    if (t.v === '(') {
      const e = this.ternary()
      this.eatOp(')')
      return e
    }
    if (t.v === '[') {
      const items: Expr[] = []
      while (!this.isOp(']')) {
        if (this.done()) throw new ExprError('expected "]"')
        items.push(this.ternary())
        if (this.isOp(',')) this.p++
      }
      this.p++
      return { t: 'list', items }
    }
    throw new ExprError(`unexpected "${t.v}"`)
  }
}

/** Parses a whole expression; throws ExprError on anything left over or malformed. */
export function parseExpr(src: string): Expr {
  const p = new Parser(lex(src))
  const e = p.ternary()
  if (!p.done()) throw new ExprError('unexpected text after the expression')
  return e
}

/** Parses the next expression from `src` and returns what is left over (for `{% tag a b %}`). */
export function parseExprs(src: string): Expr[] {
  const p = new Parser(lex(src))
  const out: Expr[] = []
  while (!p.done()) out.push(p.postfix(true))
  return out
}

export { ExprError }
