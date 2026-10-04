import type { ArrayNode, Node, Span } from '../../ast'
import type { Token } from '../tokenizer'

export const CLOSER: Record<string, string> = { '{': '}', '[': ']', '(': ')' }

export const isPunct = (t: Token, ...values: string[]) =>
  t.kind === 'punct' && values.includes(t.value)
export const isCloser = (t: Token) => isPunct(t, '}', ']', ')')
export const isSeparator = (t: Token) => isPunct(t, ',', ';')
export const startsValue = (t: Token) =>
  t.kind === 'string' ||
  t.kind === 'number' ||
  t.kind === 'ident' ||
  t.kind === 'repr' ||
  t.kind === 'ellipsis' ||
  isPunct(t, '{', '[', '(', '-', '+')

export const span = (tok: Token): Span => ({ start: tok.start, end: tok.end })

export const keyFromName = (node: Node): Node => {
  if (node.kind !== 'name') return node
  return { kind: 'string', value: node.name, span: node.span }
}

/** Python prints a container that contains itself as `[...]` / `{...}`. */
export function cyclicMarker(node: ArrayNode, text: string): Node | undefined {
  if (node.items.length === 1 && node.items[0].kind === 'repr' && node.items[0].text === '...') {
    return { kind: 'repr', text, span: node.span }
  }
  return undefined
}
