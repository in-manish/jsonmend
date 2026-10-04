import type { Node, Span } from '../../ast'
import type { FormatOptions } from '../../options'
import type { Category, Severity } from '../../report'

export type ParseOptions = Pick<
  FormatOptions,
  'maxDepth' | 'multipleValues' | 'danglingKey' | 'truncatedString'
>

export interface Element {
  key?: Node
  value: Node
}

export interface ItemsResult {
  end: number
  /** `eof`: input ended first. `implicit`: an outer closer arrived first. */
  closed: 'normal' | 'eof' | 'implicit'
  sawComma: boolean
  trailingComma: boolean
}

export type ReportFn = (
  severity: Severity,
  code: string,
  message: string,
  span?: Span,
  category?: Category,
) => number
