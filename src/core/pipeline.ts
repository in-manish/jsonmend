import { jsonrepair } from 'jsonrepair'
import type { JsonNode, Node, Span } from './ast'
import { extract } from './extract'
import { type FormatOptions, resolveOptions } from './options'
import { parseLenient } from './parse/lenient'
import { ParseError, parseStrictJson } from './parse/strict'
import { countBySeverity, type Diagnostic, type Position, positionAt, Reporter } from './report'
import { serialize } from './serialize'
import { transform } from './transform'

/** Which route produced the output. */
export type ParsePath = 'strict' | 'lenient' | 'fallback'

export interface FormatError {
  message: string
  position?: Position
}

export interface FormatResult {
  ok: boolean
  /** Verified valid JSON (or JSON Lines) when `ok`; empty otherwise. */
  output: string
  diagnostics: Diagnostic[]
  path?: ParsePath
  error?: FormatError
  /** `low` when any repair was a guess the user should verify. */
  confidence: 'high' | 'low'
  /** Payload candidates found in noisy input, and which one was used. */
  payloads: { list: Span[]; index: number }
  stats: { inputChars: number; outputChars: number; durationMs: number }
}

const now = () => performance.now()

/**
 * Stages:
 *   1. strict: lossless RFC 8259 parse of the raw text (the fast path)
 *   2. extract: find the payload inside noisy text
 *   3. lenient parse: Python/JS superset with structural repair
 *   4. fallback: jsonrepair, only if the lenient parser produced nothing
 *   5. transform: Python/JS types -> JSON values
 *   6. serialize
 *   7. validate with JSON.parse; nothing unverified is reported as success
 */
export function format(input: string, options: Partial<FormatOptions> = {}): FormatResult {
  const started = now()
  const opts = resolveOptions(options)
  const reporter = new Reporter()
  let payloads: FormatResult['payloads'] = { list: [], index: 0 }

  const finish = (fields: Pick<FormatResult, 'ok' | 'output' | 'path' | 'error'>): FormatResult => {
    const diagnostics = reporter.finish()
    return {
      ...fields,
      diagnostics,
      confidence: countBySeverity(diagnostics).guess > 0 ? 'low' : 'high',
      payloads,
      stats: {
        inputChars: input.length,
        outputChars: fields.output.length,
        durationMs: now() - started,
      },
    }
  }

  const fail = (message: string, offset?: number): FormatResult => {
    reporter.add({
      severity: 'error',
      category: 'input',
      code: 'input.unparseable',
      message,
      span: offset === undefined ? undefined : { start: offset, end: offset },
    })
    return finish({
      ok: false,
      output: '',
      error: { message, position: offset === undefined ? undefined : positionAt(input, offset) },
    })
  }

  // A BOM becomes a space so every offset still matches the input.
  let text = input
  if (text.charCodeAt(0) === 0xfeff) {
    text = ` ${text.slice(1)}`
    reporter.add({
      severity: 'info',
      category: 'normalize',
      code: 'normalize.bom',
      message: 'Removed byte order mark',
    })
  }
  if (text.trim() === '') return fail('Input is empty')

  let root: JsonNode
  let path: ParsePath
  try {
    root = parseStrictJson(text, opts.maxDepth)
    path = 'strict'
    reporter.add({
      severity: 'info',
      category: 'input',
      code: 'input.valid-json',
      message: 'Input is already valid JSON',
    })
    payloads = { list: [{ start: 0, end: text.length }], index: 0 }
    // Only string rewriting can change valid JSON, so transform just for that option.
    if (opts.normalizeDateStrings) root = transform(root, text, opts, reporter)
  } catch (strictError) {
    if (!(strictError instanceof ParseError)) throw strictError
    if (/deeper than/.test(strictError.message))
      return fail(strictError.message, strictError.offset)

    const region = extract(text, reporter, opts.payloadIndex)
    payloads = { list: region.payloads, index: region.index }
    let ast: Node | undefined
    try {
      ast = parseLenient(text, region.start, region.end, reporter, opts)
    } catch (e) {
      if (e instanceof ParseError) return fail(e.message, e.offset)
      if (e instanceof RangeError) return fail('Input is nested too deeply to repair')
      throw e
    }

    if (ast) {
      path = 'lenient'
      try {
        root = transform(ast, text, opts, reporter)
      } catch (e) {
        if (e instanceof RangeError) return fail('Input is nested too deeply to convert')
        throw e
      }
    } else {
      try {
        const repaired = jsonrepair(text.slice(region.start, region.end))
        root = parseStrictJson(repaired, opts.maxDepth)
        path = 'fallback'
        reporter.add({
          severity: 'guess',
          category: 'structure',
          code: 'structure.fallback-repair',
          message: 'Reconstructed the input with the jsonrepair fallback',
        })
      } catch {
        return fail(strictError.message, strictError.offset)
      }
    }
  }

  const output = serialize(root, opts, reporter)

  try {
    if (root.kind === 'array' && root.form === 'lines') {
      for (const line of output.split('\n')) JSON.parse(line)
    } else {
      JSON.parse(output)
    }
  } catch (e) {
    return fail(`Internal error: generated output is not valid JSON (${(e as Error).message})`)
  }

  return finish({ ok: true, output, path })
}
