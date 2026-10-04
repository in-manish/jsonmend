import type { ArrayNode, CallNode, Entry, Kwarg, Node, ObjectNode } from '../../ast'
import type { Reporter } from '../../report'
import type { Token } from '../tokenizer'
import {
  CLOSER,
  cyclicMarker,
  isCloser,
  isPunct,
  isSeparator,
  keyFromName,
  span,
  startsValue,
} from './tokens'
import { assembleTop } from './top'
import type { Element, ParseOptions } from './types'
import { ValueParser } from './values'

/**
 * Lenient recursive-descent parser over a superset of JSON, Python literals and JS object
 * literals. Structural problems are repaired with a bracket stack and reported; the parser
 * only throws a ParseError for nesting beyond `maxDepth`.
 */
export function parseLenient(
  text: string,
  start: number,
  end: number,
  reporter: Reporter,
  opts: ParseOptions,
): Node | undefined {
  const parser = new Parser(text, start, end, reporter, opts)
  try {
    return parser.parseTop()
  } finally {
    parser.lexer.finish()
  }
}

class Parser extends ValueParser {
  parseTop(): Node | undefined {
    const items: Element[] = []
    const strays: Token[] = []
    let commas = 0

    for (;;) {
      const tok = this.lexer.peek()
      if (tok.kind === 'eof') break
      if (isSeparator(tok)) {
        this.lexer.next()
        commas++
        continue
      }
      if (isCloser(tok)) {
        this.lexer.next()
        strays.push(tok)
        continue
      }
      if (isPunct(tok, ':', '=')) {
        this.lexer.next()
        this.report('warn', 'structure.skipped', `Skipped unexpected ${tok.value}`, span(tok))
        continue
      }
      const value = this.parseValue('value')
      if (!value) continue
      if (isPunct(this.lexer.peek(), ':')) {
        this.lexer.next()
        const key = value.kind === 'name' ? keyFromName(value) : value
        const entryValue = this.parseEntryValue(key)
        if (entryValue) items.push({ key, value: entryValue })
        continue
      }
      items.push({ value })
    }

    this.reportEofClosers()
    return assembleTop(items, strays, commas, this.report.bind(this), this.opts.multipleValues)
  }

  protected parseContainer(): Node {
    const open = this.lexer.next()
    const closer = CLOSER[open.value]
    this.enter(open, closer)

    if (open.value === '{') return this.parseBrace(open, closer)

    const items: Node[] = []
    const result = this.items(closer, (tok, needSep) => {
      const last = items.at(-1)
      if (needSep) {
        // pprint splits long strings into adjacent literals inside parentheses: ('ab' 'cd').
        if (open.value === '(' && tok.kind === 'string' && !tok.bytes && last?.kind === 'string') {
          this.lexer.next()
          last.value += tok.value
          if (last.span) last.span.end = tok.end
          return true
        }
        this.missingComma(tok)
      }
      const value = this.parseValue('value')
      if (value) items.push(value)
      return value !== undefined
    })

    if (open.value === '(' && items.length === 1 && !result.sawComma) {
      this.stack.pop()
      if (result.closed === 'eof') this.closedAtEof.push({ closer })
      return items[0]
    }
    const node: ArrayNode = {
      kind: 'array',
      items,
      form: open.value === '(' ? 'tuple' : 'list',
    }
    this.finishContainer(node, open, closer, result)
    return cyclicMarker(node, '[...]') ?? node
  }

  protected parseBrace(open: Token, closer: string): Node {
    const elements: Element[] = []
    let isDict: boolean | undefined
    const result = this.items(closer, (tok, needSep) => {
      if (needSep) this.missingComma(tok)
      const key = this.parseValue('key')
      if (!key) return false
      const next = this.lexer.peek()
      if (isPunct(next, ':')) {
        this.lexer.next()
        isDict = true
        const value = this.parseEntryValue(key)
        if (value) elements.push({ key, value })
        return true
      }
      const keyLike = key.kind === 'string' || key.kind === 'number'
      if (isDict !== false && keyLike && startsValue(next) && !next.newlineBefore) {
        this.report('warn', 'structure.missing-colon', 'Inserted a missing colon', {
          start: next.start,
          end: next.start,
        })
        isDict = true
        const value = this.parseValue('value')
        elements.push({ key, value: value ?? { kind: 'null' } })
        return true
      }
      if (isDict && (isCloser(next) || isSeparator(next) || next.kind === 'eof')) {
        const value = this.parseEntryValue(key)
        if (value) elements.push({ key, value })
        return true
      }
      isDict ??= false
      elements.push({ value: key })
      return true
    })

    if (isDict !== false) {
      const entries: Entry[] = []
      for (const e of elements) {
        if (e.key) entries.push({ key: e.key, value: e.value })
        else {
          this.report(
            'warn',
            'structure.dangling-key',
            'Set the missing value of a key to null',
            e.value.span,
          )
          entries.push({ key: e.value, value: { kind: 'null' } })
        }
      }
      const node: ObjectNode = { kind: 'object', entries }
      this.finishContainer(node, open, closer, result)
      return node
    }
    const node: ArrayNode = {
      kind: 'array',
      items: elements.map((e) => e.value),
      form: 'set',
    }
    this.finishContainer(node, open, closer, result)
    return cyclicMarker(node, '{...}') ?? node
  }

  protected parseCall(nameTok: Token): Node {
    const open = this.lexer.next()
    this.enter(open, ')')
    const args: Node[] = []
    const kwargs: Kwarg[] = []
    const result = this.items(')', (tok, needSep) => {
      if (needSep) this.missingComma(tok)
      if (tok.kind === 'ident' && isPunct(this.lexer.peek(1), '=')) {
        this.lexer.next()
        this.lexer.next()
        const value = this.parseValue('value')
        kwargs.push({ name: tok.value, value: value ?? { kind: 'null' } })
        return true
      }
      if (isPunct(tok, '*')) {
        this.lexer.next()
        return false
      }
      const value = this.parseValue('value')
      if (value) args.push(value)
      return value !== undefined
    })
    this.stack.pop()
    if (result.closed === 'eof') this.closedAtEof.push({ closer: ')' })
    const node: CallNode = {
      kind: 'call',
      name: nameTok.value,
      args,
      kwargs,
      span: { start: nameTok.start, end: result.end },
    }
    return node
  }
}
