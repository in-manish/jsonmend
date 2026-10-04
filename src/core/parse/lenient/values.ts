import type { Node } from '../../ast'
import type { Token } from '../tokenizer'
import { ParserBase } from './base'
import { COMPLETABLE, CONSTANTS, constantFor, constantJson } from './constants'
import { isCloser, isPunct, isSeparator, keyFromName, span } from './tokens'

/** Scalars, names, constants and calls. Containers are parsed by the subclass. */
export abstract class ValueParser extends ParserBase {
  /** Parses one value. Returns undefined, without consuming, on closers, separators and `:`. */
  protected parseValue(ctx: 'key' | 'value'): Node | undefined {
    const tok = this.lexer.peek()
    switch (tok.kind) {
      case 'eof':
        return undefined
      case 'punct':
        if (isPunct(tok, '{', '[', '(')) return this.parseContainer()
        if (isPunct(tok, '-', '+')) return this.parseSigned()
        if (isCloser(tok) || isSeparator(tok) || isPunct(tok, ':', '=')) return undefined
        this.lexer.next()
        this.report('warn', 'structure.skipped', `Skipped unexpected ${tok.value}`, span(tok))
        return undefined
      case 'string':
        this.lexer.next()
        return this.stringNode(tok)
      case 'number':
        this.lexer.next()
        return this.numberNode(tok, '')
      case 'ident':
        this.lexer.next()
        return this.identNode(tok, ctx)
      case 'repr':
        this.lexer.next()
        return { kind: 'repr', text: tok.value, span: span(tok) }
      case 'ellipsis':
        this.lexer.next()
        return { kind: 'repr', text: '...', span: span(tok) }
      case 'unknown':
        this.lexer.next()
        this.report('warn', 'structure.skipped', `Skipped unexpected ${tok.value}`, span(tok))
        return undefined
    }
  }

  protected stringNode(tok: Token): Node | undefined {
    let mark: number | undefined
    if (!tok.closed) {
      if (this.opts.truncatedString === 'drop') {
        this.report(
          'warn',
          'structure.truncated-string',
          'Dropped a string cut off by the end of input',
          span(tok),
        )
        return undefined
      }
      mark = this.report(
        'warn',
        'structure.truncated-string',
        'Closed a string cut off by the end of input',
        span(tok),
      )
    }
    if (tok.bytes) return { kind: 'bytes', bytes: tok.bytes, span: span(tok), mark }
    return { kind: 'string', value: tok.value, span: span(tok), mark }
  }

  protected numberNode(tok: Token, sign: '' | '-', start = tok.start): Node {
    const raw = sign + tok.value
    if (tok.imaginary) {
      return { kind: 'complex', re: '0', im: raw, span: { start, end: tok.end } }
    }
    // `1+2j` / `1-2j`
    const op = this.lexer.peek()
    const im = this.lexer.peek(1)
    if (isPunct(op, '+', '-') && im.kind === 'number' && im.imaginary && !op.spaceBefore) {
      this.lexer.next()
      this.lexer.next()
      const imRaw = op.value === '-' ? `-${im.value}` : im.value
      return { kind: 'complex', re: raw, im: imRaw, span: { start, end: im.end } }
    }
    return { kind: 'number', raw, span: { start, end: tok.end } }
  }

  protected parseSigned(): Node | undefined {
    const signTok = this.lexer.next()
    const sign = signTok.value === '-' ? '-' : ''
    const tok = this.lexer.peek()
    if (tok.kind === 'number') {
      this.lexer.next()
      if (!sign) {
        this.report('info', 'type.number-format', 'Removed a leading + sign', span(signTok), 'type')
      }
      return this.numberNode(tok, sign, signTok.start)
    }
    const constant = tok.kind === 'ident' ? constantFor(tok.value) : undefined
    if (constant) {
      this.lexer.next()
      const node = constant.node()
      if (node.kind === 'nonfinite') {
        return {
          kind: 'nonfinite',
          value: node.value === 'Infinity' && sign ? '-Infinity' : node.value,
          span: { start: signTok.start, end: tok.end },
        }
      }
      return node
    }
    this.report('warn', 'structure.skipped', `Skipped stray ${signTok.value}`, span(signTok))
    return undefined
  }

  protected identNode(tok: Token, ctx: 'key' | 'value'): Node {
    const name = tok.value
    const next = this.lexer.peek()
    if (isPunct(next, '(')) return this.parseCall(tok)

    const constant = constantFor(name)
    if (constant) {
      const node = constant.node()
      node.span = span(tok)
      if (!constant.json) {
        node.mark = this.reporter.add({
          severity: 'info',
          category: 'type',
          code: 'type.constant',
          message: `Converted ${name}`,
          span: span(tok),
          original: name,
          converted: constantJson(node),
        })
      }
      return node
    }

    if (ctx === 'value' && next.kind === 'eof') {
      const full = COMPLETABLE.find((c) => c.startsWith(name) && c !== name)
      if (full) {
        const node = CONSTANTS[full].node()
        node.span = span(tok)
        node.mark = this.report(
          'guess',
          'structure.truncated-literal',
          `Completed truncated ${name} as ${constantJson(node)}`,
          span(tok),
        )
        return node
      }
    }

    if (ctx === 'key') {
      this.report('info', 'structure.unquoted-key', `Quoted key ${name}`, span(tok))
      return keyFromName({ kind: 'name', name, span: span(tok) })
    }
    return { kind: 'name', name, span: span(tok) }
  }

  protected abstract parseContainer(): Node
  protected abstract parseCall(nameTok: Token): Node
}
