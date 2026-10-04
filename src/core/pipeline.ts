import type { Node } from './ast'
import { normalize } from './normalize'
import { type FormatOptions, resolveOptions } from './options'
import { type Diagnostic, type Position, positionAt } from './report'
import { serialize } from './serialize'
import { ParseError, parseStrictJson } from './strictParse'

/** Which route produced the AST. Later phases add `lenient` and `repair`. */
export type ParsePath = 'strict' | 'normalized'

export interface FormatError {
  message: string
  position?: Position
}

export interface FormatResult {
  ok: boolean
  /** Verified valid JSON when `ok`; empty otherwise. */
  output: string
  diagnostics: Diagnostic[]
  path?: ParsePath
  error?: FormatError
  stats: { inputChars: number; outputChars: number; durationMs: number }
}

const now = () => performance.now()

/**
 * Stages, each pure:
 *   1. strip BOM
 *   2. fast path: strict JSON parse of the raw text
 *   3. normalize (smart quotes, NBSP, ...) and retry, only if 2 failed
 *   4. serialize
 *   5. validate the output with JSON.parse; nothing unverified is reported as success
 *
 * Spans in diagnostics refer to the text after step 1, or after step 3 on the normalized path.
 */
export function format(input: string, options: Partial<FormatOptions> = {}): FormatResult {
  const started = now()
  const opts = resolveOptions(options)
  const diagnostics: Diagnostic[] = []

  const finish = (fields: Omit<FormatResult, 'diagnostics' | 'stats'>): FormatResult => ({
    ...fields,
    diagnostics,
    stats: {
      inputChars: input.length,
      outputChars: fields.output.length,
      durationMs: now() - started,
    },
  })

  const fail = (message: string, text?: string, offset?: number): FormatResult => {
    diagnostics.push({ severity: 'error', category: 'input', code: 'input.unparseable', message })
    return finish({
      ok: false,
      output: '',
      error: {
        message,
        position: text !== undefined && offset !== undefined ? positionAt(text, offset) : undefined,
      },
    })
  }

  let text = input
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
    diagnostics.push({
      severity: 'info',
      category: 'normalize',
      code: 'normalize.bom',
      message: 'Removed byte order mark',
    })
  }
  if (text.trim() === '') return fail('Input is empty')

  let ast: Node | undefined
  let path: ParsePath
  try {
    ast = parseStrictJson(text, opts.maxDepth)
    path = 'strict'
    diagnostics.push({
      severity: 'info',
      category: 'input',
      code: 'input.valid-json',
      message: 'Input is already valid JSON',
    })
  } catch (e) {
    if (!(e instanceof ParseError)) throw e
    const normalized = normalize(text)
    if (normalized.diagnostics.length > 0) {
      try {
        ast = parseStrictJson(normalized.value, opts.maxDepth)
        diagnostics.push(...normalized.diagnostics)
      } catch {
        // Report the error against the original text, which is what the user sees.
      }
    }
    if (!ast) return fail(e.message, text, e.offset)
    path = 'normalized'
  }

  const serialized = serialize(ast, opts)
  diagnostics.push(...serialized.diagnostics)

  try {
    JSON.parse(serialized.value)
  } catch (e) {
    return fail(`Internal error: generated output is not valid JSON (${(e as Error).message})`)
  }

  return finish({ ok: true, output: serialized.value, path })
}
