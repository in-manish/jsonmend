export type TemplateMode = 'auto' | 'on' | 'off'

export interface HtmlOptions {
  /** Spaces per level, or a tab. */
  indent: 2 | 4 | 'tab'
  /** Lines wrap at this many characters (text and long tags only; never inside a word). */
  width: number
  /** Treat Django / Jinja `{{ }}`, `{% %}` and `{# #}` as opaque, and check them. */
  template: TemplateMode
}

export const DEFAULT_HTML_OPTIONS: HtmlOptions = { indent: 2, width: 100, template: 'auto' }

/** A text replacement in the input; `from === to` inserts. */
export interface Edit {
  from: number
  to: number
  insert: string
  /** Tie-break for edits at the same offset: lower goes first (default 0). */
  order?: number
}

export type HtmlIssueCode =
  | 'tpl-unclosed-delimiter'
  | 'tpl-unclosed-block'
  | 'tpl-unexpected-end'
  | 'tpl-unexpected-middle'
  | 'tpl-end-name'
  | 'tpl-typo'
  | 'tpl-case'
  | 'tpl-syntax'
  | 'tpl-missing-arg'
  | 'html-unclosed'
  | 'html-unmatched'
  | 'html-unterminated-tag'
  | 'verify-failed'

export interface HtmlIssue {
  /** 1-based line of `from` in the input. */
  line: number
  from: number
  to: number
  code: HtmlIssueCode
  /** `error` = broken, `warn` = suspicious, `info` = FYI. */
  severity: 'error' | 'warn' | 'info'
  message: string
  /** What to change, in words. */
  suggestion?: string
  /** Edits that apply the suggestion without touching anything else. */
  fixes?: Edit[]
}

export interface HtmlResult {
  output: string
  issues: HtmlIssue[]
  /** Whether template mode was in effect (resolved from `auto`). */
  template: boolean
}

/** Applies non-overlapping edits; edits at the same offset keep their given order. */
export function applyEdits(src: string, edits: Edit[]): string {
  const sorted = edits
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.from - b.e.from || (a.e.order ?? 0) - (b.e.order ?? 0) || a.i - b.i)
  let out = ''
  let pos = 0
  for (const { e } of sorted) {
    if (e.from < pos) continue
    out += src.slice(pos, e.from) + e.insert
    pos = e.to
  }
  return out + src.slice(pos)
}

export function lineStarts(src: string): number[] {
  const starts = [0]
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1)
  return starts
}

export function lineOf(starts: number[], offset: number): number {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}
