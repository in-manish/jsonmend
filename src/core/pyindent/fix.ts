/**
 * Python indentation fixer. Pure TS: analyses leading whitespace of each logical line (never
 * inside strings, brackets or backslash continuations), rebuilds it from the block structure
 * with a fixed indent size, and reports every line it changed or could not safely change.
 */

export interface PyIndentOptions {
  /** Spaces per indentation level in the output. */
  indentSize: number
  /** How many columns a tab counts as when measuring the original indentation. */
  tabWidth: number
  /** If the first line is indented (a pasted method), shift the whole snippet to column 0. */
  dedentSnippet: boolean
}

export const DEFAULT_PY_OPTIONS: PyIndentOptions = {
  indentSize: 4,
  tabWidth: 4,
  dedentSnippet: true,
}

export type IssueCode =
  | 'tab'
  | 'mixed'
  | 'indent-size'
  | 'snippet-indent'
  | 'unexpected-indent'
  | 'inconsistent-dedent'
  | 'missing-block'
  | 'crlf'

export interface PyIssue {
  /** 1-based line number in the input. */
  line: number
  /** Input offsets of the offending whitespace (or the whole line start for line-level issues). */
  from: number
  to: number
  code: IssueCode
  /** `error` = needs your attention, `guess` = fixed by a guess, `warn`/`info` = fixed safely. */
  severity: 'info' | 'warn' | 'guess' | 'error'
  message: string
  /** True when the output differs from the input for this line because of this issue. */
  fixed: boolean
}

export interface PyIndentResult {
  output: string
  issues: PyIssue[]
  /** Lines whose indentation changed. */
  changedLines: number
}

interface LineInfo {
  text: string
  /** Offset of the line start in the input. */
  start: number
  kind: 'verbatim' | 'continuation' | 'blank' | 'comment' | 'code'
  /** Index of the logical line this continuation belongs to. */
  owner: number
  /** Last significant character of the logical line starting here ('' if none). */
  lastCode: string
}

const leadingWs = (s: string) => /^[ \t\f]*/.exec(s)?.[0] ?? ''

function width(ws: string, tabWidth: number): number {
  let col = 0
  for (const ch of ws) col = ch === '\t' ? col + tabWidth - (col % tabWidth) : col + 1
  return col
}

/** Classifies each line: which are logical-line starts and which sit inside a string/bracket. */
function scan(lines: string[]): LineInfo[] {
  const infos: LineInfo[] = []
  let offset = 0
  let triple: string | undefined // delimiter of the open triple-quoted string
  let depth = 0
  let continued = false
  let owner = -1
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    const start = offset
    offset += text.length + 1
    const inside = triple !== undefined || depth > 0 || continued
    const info: LineInfo = { text, start, kind: 'code', owner: i, lastCode: '' }
    const startedInTriple = triple !== undefined
    const wasContinued = continued
    continued = false

    let hasCode = false
    let comment = false
    let quote: string | undefined
    for (let j = 0; j < text.length; j++) {
      const ch = text[j]
      if (triple !== undefined) {
        if (ch === '\\') j++
        else if (text.startsWith(triple, j)) {
          triple = undefined
          j += 2
          hasCode = true
        }
        continue
      }
      if (quote !== undefined) {
        if (ch === '\\') j++
        else if (ch === quote) quote = undefined
        continue
      }
      if (ch === '#') {
        comment = true
        break
      }
      if (ch === '"' || ch === "'") {
        hasCode = true
        info.lastCode = ch
        if (text.startsWith(ch.repeat(3), j)) {
          triple = ch.repeat(3)
          j += 2
        } else quote = ch
        continue
      }
      if (ch === '(' || ch === '[' || ch === '{') depth++
      else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1)
      if (ch === '\\' && j === text.length - 1) {
        continued = true
        continue
      }
      if (ch !== ' ' && ch !== '\t' && ch !== '\f') {
        hasCode = true
        info.lastCode = ch
      }
    }

    if (startedInTriple) info.kind = 'verbatim'
    else if (inside || wasContinued) {
      info.kind = 'continuation'
      info.owner = owner
    } else if (!hasCode && !comment) info.kind = 'blank'
    else if (!hasCode && comment) info.kind = 'comment'
    else owner = i
    // A line inside brackets that is blank or comment-only is still a continuation.
    infos.push(info)
  }
  return infos
}

export function fixPythonIndentation(
  input: string,
  options: Partial<PyIndentOptions> = {},
): PyIndentResult {
  const opts = { ...DEFAULT_PY_OPTIONS, ...options }
  const issues: PyIssue[] = []
  const hasCR = input.includes('\r')
  const rawLines = input.split('\n')
  if (hasCR) {
    issues.push({
      line: 1,
      from: 0,
      to: 0,
      code: 'crlf',
      severity: 'info',
      message: 'Windows (CRLF) line endings converted to LF',
      fixed: true,
    })
  }
  const lines = rawLines.map((l) => l.replace(/\r$/, ''))
  const infos = scan(lines)

  const out: (string | undefined)[] = new Array(lines.length)
  const newIndentOf = new Map<number, number>() // logical-line index -> new indent
  const oldWidthOf = new Map<number, number>()
  const stack: number[] = []
  const stackAt = new Map<number, number[]>() // comment line -> snapshot
  let prevOpensBlock = false
  let prevCodeIndex = -1
  let changed = 0

  const issue = (
    i: number,
    ws: string,
    code: IssueCode,
    severity: PyIssue['severity'],
    message: string,
    fixed = true,
  ) =>
    issues.push({
      line: i + 1,
      from: infos[i].start,
      to: infos[i].start + Math.max(ws.length, 0),
      code,
      severity,
      message,
      fixed,
    })

  // Pass 1: logical code lines decide their level; everything else is placed in pass 2.
  for (let i = 0; i < infos.length; i++) {
    const info = infos[i]
    if (info.kind === 'comment') stackAt.set(i, [...stack])
    if (info.kind !== 'code') continue
    const ws = leadingWs(info.text)
    const w = width(ws, opts.tabWidth)
    oldWidthOf.set(i, w)
    let level: number
    let covered = false // a more specific issue already explains this line's change

    if (stack.length === 0) {
      stack.push(opts.dedentSnippet ? w : 0)
      level = 0
      if (opts.dedentSnippet && w > 0) {
        covered = true
        issue(i, ws, 'snippet-indent', 'info', 'Snippet was indented; shifted to column 0')
      }
      if (!opts.dedentSnippet && w > 0) {
        level = 0
        issue(
          i,
          ws,
          'unexpected-indent',
          'error',
          'The first line of a file cannot be indented',
          false,
        )
      }
    } else {
      const top = stack[stack.length - 1]
      if (w > top) {
        if (prevOpensBlock) {
          stack.push(w)
        } else {
          covered = true
          issue(
            i,
            ws,
            'unexpected-indent',
            'guess',
            `Unexpected indent: the previous line does not end with ":"; aligned it with the previous line, please verify`,
          )
        }
      } else {
        if (prevOpensBlock) {
          issue(
            i,
            ws,
            'missing-block',
            'error',
            `Expected an indented block after the ":" on line ${prevCodeIndex + 1}`,
            false,
          )
        }
        while (stack.length > 1 && stack[stack.length - 1] > w) stack.pop()
        if (stack[stack.length - 1] !== w) {
          covered = true
          issue(
            i,
            ws,
            'inconsistent-dedent',
            'guess',
            'Unindent does not match any outer indentation level; aligned it with the nearest outer block, please verify',
          )
        }
      }
      level = stack.length - 1
    }

    const newIndent = level * opts.indentSize
    newIndentOf.set(i, newIndent)
    const wanted = ' '.repeat(newIndent)
    if (ws !== wanted) changed++

    if (!covered && ws !== wanted) {
      const hasTab = ws.includes('\t')
      if (hasTab && ws.includes(' ')) {
        issue(
          i,
          ws,
          'mixed',
          'warn',
          `Tabs and spaces mixed in indentation; rebuilt as ${newIndent} spaces`,
        )
      } else if (hasTab) {
        issue(i, ws, 'tab', 'warn', `Tab used for indentation; replaced with ${newIndent} spaces`)
      } else {
        issue(
          i,
          ws,
          'indent-size',
          'info',
          `Indented ${ws.length} spaces; normalized to ${newIndent}`,
        )
      }
    }

    prevOpensBlock = info.lastCode === ':'
    prevCodeIndex = i
  }

  // Pass 2: place every line.
  for (let i = 0; i < infos.length; i++) {
    const info = infos[i]
    const text = info.text
    if (info.kind === 'verbatim') {
      out[i] = text
    } else if (info.kind === 'blank') {
      out[i] = ''
    } else if (info.kind === 'code') {
      out[i] = ' '.repeat(newIndentOf.get(i) ?? 0) + text.slice(leadingWs(text).length)
    } else if (info.kind === 'continuation') {
      const ws = leadingWs(text)
      const body = text.slice(ws.length)
      if (body === '') {
        out[i] = ''
        continue
      }
      const delta = (newIndentOf.get(info.owner) ?? 0) - (oldWidthOf.get(info.owner) ?? 0)
      const w = Math.max(0, width(ws, opts.tabWidth) + delta)
      out[i] = ' '.repeat(w) + body
      if (ws.includes('\t')) {
        issue(i, ws, 'tab', 'warn', 'Tab in a continuation line replaced with spaces')
      }
    } else {
      // comment-only line: align with the next code line when it shared its indentation
      const ws = leadingWs(text)
      const w = width(ws, opts.tabWidth)
      let next = i + 1
      while (next < infos.length && infos[next].kind !== 'code') next++
      let indent: number
      if (next < infos.length && oldWidthOf.get(next) === w) {
        indent = newIndentOf.get(next) ?? 0
      } else {
        const snap = stackAt.get(i) ?? []
        let level = 0
        for (let k = 0; k < snap.length; k++) if (snap[k] <= w) level = k
        indent = level * opts.indentSize
      }
      out[i] = ' '.repeat(indent) + text.slice(ws.length)
      if (ws !== ' '.repeat(indent)) {
        if (ws.includes('\t'))
          issue(i, ws, 'tab', 'warn', `Tab before comment replaced with ${indent} spaces`)
        else
          issue(
            i,
            ws,
            'indent-size',
            'info',
            `Comment indented ${ws.length} spaces; normalized to ${indent}`,
          )
      }
    }
  }

  // Trailing whitespace is noise in a terminal paste; strip it, except inside strings.
  let output = out
    .map((l, i) => (infos[i].kind === 'verbatim' ? (l ?? '') : (l ?? '').replace(/[ \t]+$/, '')))
    .join('\n')
  output = output.replace(/\n+$/, '')
  if (output.length > 0) output += '\n'

  issues.sort((a, b) => a.line - b.line || a.from - b.from)
  return { output, issues, changedLines: changed }
}

/** `python3 -c "$(cat <<'PY' ... PY)"`: pastes into bash/zsh and runs without a file. */
export function terminalCommand(code: string): string {
  let tag = 'PY'
  while (code.split('\n').includes(tag)) tag += '_'
  const body = code.endsWith('\n') ? code : `${code}\n`
  return `python3 -c "$(cat <<'${tag}'\n${body}${tag}\n)"\n`
}
