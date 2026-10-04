import type { ArrayNode, Node, ObjectNode, Span } from '../../ast'
import type { Diagnostic, Reporter, Severity } from '../../report'
import { ParseError } from '../strict'
import { Lexer, type Token } from '../tokenizer'
import { isCloser, isPunct, isSeparator, span } from './tokens'
import type { ItemsResult, ParseOptions } from './types'

/**
 * State and bracket handling shared by the lenient parser: the open-container stack, the
 * generic item loop (separators, closers, end of input) and reporting.
 */
export abstract class ParserBase {
  readonly lexer: Lexer

  protected readonly reporter: Reporter

  protected readonly opts: ParseOptions

  /** Expected closers of the open containers, innermost last. */
  protected readonly stack: string[] = []

  /** Containers closed by the end of input, innermost first. */
  protected readonly closedAtEof: { node?: ObjectNode | ArrayNode; closer: string }[] = []

  constructor(text: string, start: number, end: number, reporter: Reporter, opts: ParseOptions) {
    this.lexer = new Lexer(text, start, end, reporter)
    this.reporter = reporter
    this.opts = opts
  }

  protected report(
    severity: Severity,
    code: string,
    message: string,
    span?: Span,
    category: Diagnostic['category'] = 'structure',
  ): number {
    return this.reporter.add({ severity, category, code, message, span })
  }

  protected reportEofClosers() {
    if (this.closedAtEof.length === 0) return
    const closers = this.closedAtEof.map((c) => c.closer)
    const idx = this.report(
      'warn',
      'structure.missing-closers',
      `Added ${closers.length} closing bracket${closers.length === 1 ? '' : 's'}: ${closers.join(' ')}`,
      { start: this.lexer.lastEnd, end: this.lexer.lastEnd },
    )
    for (const { node } of this.closedAtEof) if (node && idx >= 0) node.closerMark = idx
  }

  /** Value after `key:`; a missing value becomes null (or the key is dropped). */
  protected parseEntryValue(key: Node): Node | undefined {
    const tok = this.lexer.peek()
    const value =
      tok.kind === 'eof' || isCloser(tok) || isSeparator(tok) ? undefined : this.parseValue('value')
    if (value) return value
    const label = key.kind === 'string' ? JSON.stringify(key.value) : 'key'
    if (this.opts.danglingKey === 'drop') {
      this.report(
        'warn',
        'structure.dangling-key',
        `Dropped ${label}, which had no value`,
        key.span,
      )
      return undefined
    }
    const mark = this.report(
      'warn',
      'structure.dangling-key',
      `Set the missing value of ${label} to null`,
      key.span,
    )
    return { kind: 'null', mark }
  }

  protected enter(open: Token, closer: string) {
    if (this.stack.length >= this.opts.maxDepth) {
      throw new ParseError(
        `Nesting is deeper than the ${this.opts.maxDepth}-level limit`,
        open.start,
      )
    }
    this.stack.push(closer)
  }

  /**
   * Shared loop for every bracketed sequence: handles separators, closers (matching,
   * mismatched and stray), end of input and missing commas. `parseItem` parses one element
   * and returns whether it produced something.
   */
  protected items(
    closer: string,
    parseItem: (tok: Token, needSep: boolean) => boolean,
  ): ItemsResult {
    let needSep = false
    let sawComma = false
    let trailingComma = false
    for (;;) {
      const tok = this.lexer.peek()
      if (tok.kind === 'eof') {
        return { end: this.lexer.lastEnd, closed: 'eof', sawComma, trailingComma }
      }
      if (isCloser(tok)) {
        if (tok.value === closer) {
          this.lexer.next()
          return { end: tok.end, closed: 'normal', sawComma, trailingComma }
        }
        if (this.stack.slice(0, -1).includes(tok.value)) {
          this.report(
            'warn',
            'structure.mismatched-closer',
            `Inserted the missing ${closer} before ${tok.value}`,
            { start: tok.start, end: tok.start },
          )
          return { end: this.lexer.lastEnd, closed: 'implicit', sawComma, trailingComma }
        }
        this.lexer.next()
        this.report('warn', 'structure.stray-closer', `Removed unmatched ${tok.value}`, span(tok))
        continue
      }
      if (isSeparator(tok)) {
        this.lexer.next()
        if (!needSep) {
          this.report('info', 'structure.extra-comma', 'Removed an extra comma', span(tok))
        }
        sawComma = true
        trailingComma = true
        needSep = false
        continue
      }
      if (isPunct(tok, ':', '=')) {
        this.lexer.next()
        this.report('warn', 'structure.skipped', `Skipped unexpected ${tok.value}`, span(tok))
        continue
      }
      trailingComma = false
      if (parseItem(tok, needSep)) needSep = true
    }
  }

  protected missingComma(tok: Token) {
    this.report('info', 'structure.missing-comma', 'Inserted a missing comma', {
      start: tok.start,
      end: tok.start,
    })
  }

  protected finishContainer(
    node: ObjectNode | ArrayNode,
    open: Token,
    closer: string,
    result: ItemsResult,
  ) {
    this.stack.pop()
    node.span = { start: open.start, end: result.end }
    if (result.closed === 'eof') this.closedAtEof.push({ node, closer })
    if (
      result.trailingComma &&
      result.closed === 'normal' &&
      !(node.kind === 'array' && node.form === 'tuple')
    ) {
      this.report('info', 'structure.trailing-comma', 'Removed a trailing comma', {
        start: result.end - 1,
        end: result.end,
      })
    }
  }

  protected abstract parseValue(ctx: 'key' | 'value'): Node | undefined
}
